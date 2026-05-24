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
from services.rag import rag_query

router = APIRouter(prefix="/api/realtime", tags=["Real-time Voice Agent"])

groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

# Helper to get RAG context
async def get_rag_context(prompt: str) -> str:
    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(None, rag_query, prompt, 3)
        docs = res.get("documents", [[]])[0]
        if docs:
            context = "\n--- RAG Context Start ---\n"
            for i, doc in enumerate(docs, 1):
                context += f"[Chunk {i}]\n{doc}\n\n"
            context += "--- RAG Context End ---\n"
            return context
    except Exception as e:
        print(f"RAG query failed in realtime: {e}")
    return ""

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
        "output_audio_codec": "pcm",  # LINEAR16 raw PCM
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

async def tts_runner(queue: asyncio.Queue, client_ws: WebSocket, language_code: str):
    """Processes sentences from queue and converts them to speech sequentially."""
    try:
        while True:
            sentence = await queue.get()
            if sentence is None:
                break
            await stream_tts_to_client(sentence, client_ws, language_code)
            queue.task_done()
    except asyncio.CancelledError:
        pass

async def generate_response_task(prompt: str, client_ws: WebSocket, language_code: str, use_rag: bool):
    """Background task to run RAG, Groq LLM streaming, and queue sentences for TTS."""
    if not groq_client:
        await client_ws.send_json({"type": "error", "message": "Groq client not configured"})
        return
        
    # Queue for decoupling LLM stream from TTS generation
    sentence_queue = asyncio.Queue()
    runner = asyncio.create_task(tts_runner(sentence_queue, client_ws, language_code))
    
    try:
        # Step 1: RAG context (if enabled)
        context = ""
        if use_rag:
            await client_ws.send_json({"type": "agent_status", "status": "searching_kb"})
            context = await get_rag_context(prompt)
            
        await client_ws.send_json({"type": "agent_status", "status": "thinking"})
        
        prompt_with_context = f"{context}User Query: {prompt}" if context else prompt
        
        # Step 2: Groq completion
        completion = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are Lyra, a warm and grounded voice assistant. Follow the Rule of Three: Max 3 sentences, Max 1 question. Speak naturally."
                },
                {
                    "role": "user",
                    "content": prompt_with_context
                }
            ],
            temperature=0.7,
            max_completion_tokens=500,
            stream=True
        )
        
        sentence_delimiters = {'.', '?', '!', '\n'}
        current_sentence = ""
        
        await client_ws.send_json({"type": "agent_status", "status": "speaking"})
        
        async for chunk in completion:
            token = chunk.choices[0].delta.content or ""
            if not token:
                continue
                
            current_sentence += token
            await client_ws.send_json({"type": "agent_text_delta", "text": token})
            
            # Check if sentence is complete
            if any(p in token for p in sentence_delimiters) or len(current_sentence) > 150:
                sentence_to_send = current_sentence.strip()
                if sentence_to_send:
                    await sentence_queue.put(sentence_to_send)
                current_sentence = ""
                
        # Send remaining text
        if current_sentence.strip():
            await sentence_queue.put(current_sentence.strip())
            
        # Wait for queue to finish
        await sentence_queue.put(None)
        await runner
    except asyncio.CancelledError:
        # Cancel the TTS runner
        runner.cancel()
        print("Response generation cancelled due to interruption.")
    except Exception as e:
        print(f"Error in response generation: {e}")
        await client_ws.send_json({"type": "error", "message": str(e)})

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
        async with websockets.connect(sarvam_url, extra_headers=sarvam_headers) as sarvam_ws:
            # Active response generation task
            response_task = None
            accumulated_user_transcript = ""
            
            async def client_to_sarvam():
                nonlocal response_task
                try:
                    while True:
                        message = await websocket.receive()
                        if "bytes" in message:
                            # Handle binary audio frame from browser
                            audio_data = message["bytes"]
                            if audio_data:
                                # Convert raw bytes to base64 JSON payload for Sarvam
                                payload = {
                                    "audio": {
                                        "data": base64.b64encode(audio_data).decode("utf-8"),
                                        "sample_rate": 16000,
                                        "encoding": "pcm_s16le"
                                    }
                                }
                                await sarvam_ws.send(json.dumps(payload))
                        elif "text" in message:
                            # Parse control message from browser
                            text_data = message["text"]
                            try:
                                data = json.loads(text_data)
                                if data.get("type") == "interrupt":
                                    # Cancel current agent response task
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
                nonlocal response_task, accumulated_user_transcript
                try:
                    async for message in sarvam_ws:
                        data = json.loads(message)
                        event_type = data.get("type")
                        
                        if event_type == "data":
                            # Transcription chunk
                            transcript = data.get("data", {}).get("transcript", "")
                            if transcript.strip():
                                accumulated_user_transcript = transcript
                                await websocket.send_json({
                                    "type": "user_transcript",
                                    "text": transcript
                                })
                        elif event_type == "events":
                            signal = data.get("data", {}).get("signal_type")
                            if signal == "START_SPEECH":
                                # User started speaking: interrupt the agent immediately if it is speaking
                                if response_task and not response_task.done():
                                    response_task.cancel()
                                    await websocket.send_json({"type": "interrupted"})
                                accumulated_user_transcript = ""
                            elif signal == "END_SPEECH":
                                # User stopped speaking: trigger response if we have a transcript
                                if accumulated_user_transcript.strip():
                                    if response_task and not response_task.done():
                                        response_task.cancel()
                                        
                                    response_task = asyncio.create_task(
                                        generate_response_task(
                                            accumulated_user_transcript,
                                            websocket,
                                            language_code,
                                            use_rag
                                        )
                                    )
                                    accumulated_user_transcript = ""
                except Exception as e:
                    print(f"Error in sarvam_to_client: {e}")
            
            # Run both task loops concurrently
            await asyncio.gather(
                client_to_sarvam(),
                sarvam_to_client()
            )
            
    except Exception as e:
        print(f"WebSocket session failed: {e}")
        await websocket.send_json({"type": "error", "message": f"Connection failed: {str(e)}"})
