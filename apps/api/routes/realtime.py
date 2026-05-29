"""WebSocket router for real-time bi-directional voice agent."""
import asyncio
import json
import base64
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import httpx
import websockets
from config import settings
from groq import AsyncGroq
from routes.voice_agent import LYRA_SYSTEM_PROMPT

router = APIRouter(prefix="/api/realtime", tags=["Real-time Voice Agent"])

groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

# Helper to get RAG context
async def get_rag_context(prompt: str) -> tuple[str, list]:
    try:
        from services.rag import rag_query
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(None, rag_query, prompt, 3)
        docs = res.get("documents", [[]])[0]
        metadatas = res.get("metadatas", [[]])[0]
        
        sources = []
        if docs:
            context = "\n--- RAG Context Start ---\n"
            for i, (doc, meta) in enumerate(zip(docs, metadatas), 1):
                context += f"[Chunk {i}]\n{doc}\n\n"
                
                source_path = meta.get("source", "Unknown Source")
                # Clean up path to just filename
                title = source_path.replace("\\", "/").split("/")[-1]
                
                sources.append({
                    "id": f"src-{i}",
                    "type": "VECTOR DB",
                    "title": title,
                    "desc": doc[:120] + "..." if len(doc) > 120 else doc,
                    "link": source_path
                })
            context += "--- RAG Context End ---\n"
            return context, sources
    except Exception as e:
        print(f"RAG query failed in realtime: {e}")
    return "", []

async def stream_tts_to_client(text: str, client_ws: WebSocket, language_code: str):
    """Call Sarvam TTS streaming and send PCM bytes to browser client."""
    url = "https://api.sarvam.ai/text-to-speech/stream"
    payload = {
        "text": text,
        "target_language_code": language_code,
        "speaker": "ratan",
        "model": "bulbul:v3",
        "pace": 1.1,
        "enable_preprocessing": True,
        "output_audio_codec": "linear16",  # LINEAR16 raw PCM
        "speech_sample_rate": 22050,  # 22.05kHz mono
    }
    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    
    await client_ws.send_json({"type": "agent_audio_start"})
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    if chunk:
                        await client_ws.send_bytes(chunk)
    except Exception as e:
        print(f"TTS stream to client failed: {e}")
    await client_ws.send_json({"type": "agent_audio_end"})

import re

def detect_language(text: str) -> str:
    if re.search(r'[\u0900-\u097F]', text): return "hi-IN" # Hindi/Marathi
    if re.search(r'[\u0980-\u09FF]', text): return "bn-IN" # Bengali
    if re.search(r'[\u0B80-\u0BFF]', text): return "ta-IN" # Tamil
    if re.search(r'[\u0C00-\u0C7F]', text): return "te-IN" # Telugu
    if re.search(r'[\u0C80-\u0CFF]', text): return "kn-IN" # Kannada
    if re.search(r'[\u0D00-\u0D7F]', text): return "ml-IN" # Malayalam
    if re.search(r'[\u0A80-\u0AFF]', text): return "gu-IN" # Gujarati
    if re.search(r'[\u0B00-\u0B7F]', text): return "or-IN" # Odia
    if re.search(r'[\u0A00-\u0A7F]', text): return "pa-IN" # Punjabi
    return "en-IN" # Default to English

async def generate_response_task(prompt: str, client_ws: WebSocket, language_code: str, use_rag: bool):
    """Background task to run RAG, Groq LLM streaming, and then call TTS once generated."""
    if not groq_client:
        await client_ws.send_json({"type": "error", "message": "Groq client not configured"})
        return
        
    try:
        # Step 1: RAG context (if enabled)
        context = ""
        sources = []
        if use_rag:
            await client_ws.send_json({"type": "agent_status", "status": "searching_kb"})
            context, sources = await get_rag_context(prompt)
            if sources:
                await client_ws.send_json({"type": "agent_sources", "sources": sources})
            
        await client_ws.send_json({"type": "agent_status", "status": "thinking"})
        
        brevity_instruction = "\n\n[CRITICAL RULE: Keep your response extremely brief (1-3 short sentences max). Do NOT use lists, bullet points, or markdown. You are speaking aloud, so sound natural and concise.]"
        prompt_with_context = f"{context}User Query: {prompt}{brevity_instruction}" if context else f"{prompt}{brevity_instruction}"
        
        # Step 2: Groq completion with llama-4-scout for quality + speed
        completion = await groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "system",
                    "content": LYRA_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": prompt_with_context
                }
            ],
            temperature=0.7,
            max_tokens=250,
            stream=True
        )
        
        full_response = ""
        await client_ws.send_json({"type": "agent_status", "status": "speaking"})
        
        async for chunk in completion:
            token = chunk.choices[0].delta.content or ""
            if not token:
                continue
                
            full_response += token
            await client_ws.send_json({"type": "agent_text_delta", "text": token})
            
        # Step 3: Process the full text to TTS
        if full_response.strip():
            tts_lang = detect_language(full_response)
            await stream_tts_to_client(full_response.strip(), client_ws, tts_lang)
            
    except asyncio.CancelledError:
        print("Response generation cancelled due to interruption.")
    except Exception as e:
        print(f"Error in response generation: {e}")
        await client_ws.send_json({"type": "error", "message": str(e)})

def get_wav_header(pcm_len: int, sample_rate: int = 16000) -> bytes:
    # 44-byte WAV header for 16kHz, 16-bit, mono PCM
    header = bytearray(b'RIFF')
    header.extend((pcm_len + 36).to_bytes(4, 'little'))
    header.extend(b'WAVEfmt ')
    header.extend((16).to_bytes(4, 'little')) # subchunk1size
    header.extend((1).to_bytes(2, 'little'))  # audioformat (1 = PCM)
    header.extend((1).to_bytes(2, 'little'))  # numchannels (1 = mono)
    header.extend(sample_rate.to_bytes(4, 'little')) # samplerate
    header.extend((sample_rate * 2).to_bytes(4, 'little')) # byterate (sample_rate * 1 * 2)
    header.extend((2).to_bytes(2, 'little'))  # blockalign (1 * 2)
    header.extend((16).to_bytes(2, 'little')) # bitspersample
    header.extend(b'data')
    header.extend(pcm_len.to_bytes(4, 'little'))
    return bytes(header)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Extract query params
    params = websocket.query_params
    language_code = params.get("language_code", "hi-IN")
    model = params.get("model", "saaras:v3")
    use_rag = params.get("use_rag", "true").lower() == "true"
    
    if not settings.SARVAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Sarvam API Key not configured"})
        await websocket.close()
        return

    # Connect to Sarvam STT WebSocket
    sarvam_url = f"wss://api.sarvam.ai/speech-to-text/ws?language-code={language_code}&model={model}&vad_signals=true"
    sarvam_headers = {"api-subscription-key": settings.SARVAM_API_KEY}
    
    try:
        async with websockets.connect(sarvam_url, additional_headers=sarvam_headers) as sarvam_ws:
            import time
            response_task = None
            session_prefix = ""
            turn_committed_text = ""
            latest_chunk = ""
            last_raw_transcript = ""
            last_speech_time = time.time()
            
            async def debounce_loop():
                nonlocal response_task, session_prefix, turn_committed_text, latest_chunk, last_raw_transcript, last_speech_time
                try:
                    while True:
                        await asyncio.sleep(0.5)
                        # Fire LLM if 2.0 seconds of absolute silence have passed and we have text
                        combined_text = (turn_committed_text + " " + latest_chunk).strip()
                        if combined_text and (time.time() - last_speech_time >= 2.0):
                            if response_task and not response_task.done():
                                response_task.cancel()
                            response_task = asyncio.create_task(
                                generate_response_task(combined_text, websocket, language_code, use_rag)
                            )
                            # Reset for the next turn
                            session_prefix = last_raw_transcript
                            turn_committed_text = ""
                            latest_chunk = ""
                except asyncio.CancelledError:
                    pass
            
            debounce_task_ref = asyncio.create_task(debounce_loop())

            async def client_to_sarvam():
                nonlocal response_task
                try:
                    while True:
                        message = await websocket.receive()
                        if message.get("type") == "websocket.disconnect":
                            break
                        if "bytes" in message:
                            audio_data = message["bytes"]
                            if audio_data:
                                wav_data = get_wav_header(len(audio_data)) + audio_data
                                payload = {
                                    "audio": {
                                        "data": base64.b64encode(wav_data).decode("utf-8"),
                                        "sample_rate": 16000,
                                        "encoding": "audio/wav"
                                    }
                                }
                                await sarvam_ws.send(json.dumps(payload))
                        elif "text" in message:
                            text_data = message["text"]
                            try:
                                data = json.loads(text_data)
                                if data.get("type") == "interrupt":
                                    # Clear any pending STT text so it doesn't trigger after silence
                                    turn_committed_text = ""
                                    latest_chunk = ""
                                    
                                    if response_task and not response_task.done():
                                        response_task.cancel()
                                        await websocket.send_json({"type": "interrupted"})
                            except json.JSONDecodeError:
                                pass
                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    print(f"Error in client_to_sarvam: {e}")

            async def sarvam_to_client():
                nonlocal response_task, session_prefix, turn_committed_text, latest_chunk, last_raw_transcript, last_speech_time
                try:
                    async for message in sarvam_ws:
                        data = json.loads(message)
                        event_type = data.get("type")
                        
                        if event_type in ("data", "transcript"):
                            last_speech_time = time.time()
                            
                            inner_data = data.get("data", {})
                            raw_transcript = ""
                            if isinstance(inner_data, str):
                                raw_transcript = inner_data
                            else:
                                raw_transcript = inner_data.get("transcript", "") or data.get("transcript", "")
                                
                            last_raw_transcript = raw_transcript
                            
                            # Subtract session history if STT is cumulative across turns
                            if session_prefix and raw_transcript.startswith(session_prefix):
                                new_text = raw_transcript[len(session_prefix):].strip()
                            else:
                                new_text = raw_transcript.strip()
                                
                            # Subtract turn history if STT is cumulative within a turn
                            if turn_committed_text and new_text.startswith(turn_committed_text):
                                latest_chunk = new_text[len(turn_committed_text):].strip()
                            else:
                                latest_chunk = new_text
                                
                            combined_text = (turn_committed_text + " " + latest_chunk).strip()
                            
                            if combined_text:
                                await websocket.send_json({
                                    "type": "user_transcript",
                                    "text": combined_text
                                })
                                
                        elif event_type == "error":
                            error_msg = data.get("data", {}).get("message", "Unknown Sarvam error")
                            print(f"Sarvam API Error: {error_msg}")
                            await websocket.send_json({"type": "error", "message": error_msg})
                            
                        elif event_type == "speech_start" or (event_type == "events" and data.get("data", {}).get("signal_type") == "START_SPEECH"):
                            last_speech_time = time.time()
                            if response_task and not response_task.done():
                                response_task.cancel()
                                await websocket.send_json({"type": "interrupted"})
                                
                        elif event_type == "speech_end" or (event_type == "events" and data.get("data", {}).get("signal_type") == "END_SPEECH"):
                            last_speech_time = time.time()
                            # Commit the latest chunk so a pause doesn't overwrite it
                            if latest_chunk:
                                turn_committed_text = (turn_committed_text + " " + latest_chunk).strip()
                                latest_chunk = ""
                except Exception as e:
                    print(f"Error in sarvam_to_client: {e}")
                finally:
                    debounce_task_ref.cancel()
            
            # Run both task loops concurrently, but terminate when EITHER finishes
            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(client_to_sarvam()),
                    asyncio.create_task(sarvam_to_client())
                ],
                return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
            
    except Exception as e:
        print(f"WebSocket session failed: {e}")
        await websocket.send_json({"type": "error", "message": f"Connection failed: {str(e)}"})
