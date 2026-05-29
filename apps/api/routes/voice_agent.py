"""Streaming routes for audio using FastAPI"""
import base64
from fastapi import APIRouter, HTTPException, WebSocket
from fastapi.responses import StreamingResponse
from groq import AsyncGroq, Groq
import httpx
import io
import subprocess
import sys
from pathlib import Path
from typing import Optional
from config import settings, get_model_config, get_tts_config
from schemas import VoiceAgentRequest

router = APIRouter(prefix="/api", tags=["Voice Agent Stream"])

# Initialize Groq client when configured.
groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
async_groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None


def _audio_data_url(audio_bytes: bytes, mime: str = "audio/mpeg") -> str:
    encoded = base64.b64encode(audio_bytes).decode("ascii")
    return f"data:{mime};base64,{encoded}"

# Resolve rag/ directory for RAG queries
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAG_DIR = PROJECT_ROOT / "rag"


LYRA_SYSTEM_PROMPT = """You are a warm, friendly voice assistant. You speak naturally like a real person — not like a robot or a formal helpdesk.

## Language Rules
- Always reply in the SAME language the user speaks
- If user speaks Hinglish (Hindi + English mixed) → reply in Hinglish, Roman script only, no Devanagari
- If user speaks Hindi → reply in simple modern Hindi, Roman script preferred
- If user speaks English → reply in clean casual English
- If user speaks Marathi, Telugu, Tamil, Bengali → reply in that language naturally
- NEVER switch languages unless the user switches first
- NEVER mix scripts — pick one and stay consistent

## Tone Rules
- Sound like a helpful dost, not a customer service agent
- Keep responses SHORT — 2 to 3 sentences max
- No long paragraphs, no bullet points, no lists — this is a voice conversation
- No formal words like "khed", "pratikriya", "shukriya arz hai" — use simple everyday words
- Use "haan", "acha", "theek hai", "yaar", "arre" naturally when speaking Hinglish

## Voice-Specific Rules
- Never use emojis, asterisks, bullet points, or markdown — voice cannot read these
- Never say things like "As an AI..." or "I am a language model..."
- Avoid long lists — break into natural conversational sentences instead
- If you don't know something, say it simply: "Yaar pata nahi mujhe, let me check" or "I'm not sure about that"

## Sensitive Topics
- If user seems sad, stressed, or mentions mental health — respond with empathy first, keep it short, and gently suggest talking to someone they trust or a professional
- Never give medical, legal, or financial advice — redirect warmly"""


def _query_rag(question: str, n_results: int = 4) -> list[str]:
    """Query RAG knowledge base and return list of chunk texts. Graceful fallback if RAG fails."""
    try:
        python_exe = sys.executable
        script_path = RAG_DIR / "query.py"
        if not script_path.exists():
            # Silent fallback: RAG script not available
            return []
        
        result = subprocess.run(
            [python_exe, str(script_path), question, "--n-results", str(n_results)],
            capture_output=True,
            text=True,
            cwd=str(RAG_DIR),
            timeout=30,
        )
        
        if result.returncode != 0:
            # Silent fallback: query failed
            return []
        
        # Parse results from output
        # Format: "Result N\nSource: ... | chunk: ... | distance: ...\n<text>"
        chunks = []
        lines = result.stdout.strip().splitlines()
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if line.startswith("Result "):
                # Skip metadata line, collect text lines until next Result or end
                i += 2  # Skip "Result N" and metadata line
                text_lines = []
                while i < len(lines) and not lines[i].strip().startswith("Result "):
                    text_lines.append(lines[i].strip())
                    i += 1
                text = "\n".join(text_lines).strip()
                if text:
                    chunks.append(text)
            else:
                i += 1
        
        return chunks
    except Exception:
        # Graceful fallback on any error (timeout, subprocess error, etc)
        return []


async def _stream_sarvam_pcm_to_websocket(
    text: str,
    websocket: WebSocket,
    language: str,
    speaker: str,
    pace: float,
):
    """Stream Sarvam PCM audio bytes for a sentence to the browser."""
    if not text.strip():
        return

    url = "https://api.sarvam.ai/text-to-speech/stream"
    payload = {
        "text": text,
        "target_language_code": language,
        "speaker": speaker,
        "model": "bulbul:v3",
        "pace": pace,
        "enable_preprocessing": True,
        "speech_sample_rate": 22050,
        "output_audio_codec": "linear16",
    }
    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY,
        "Content-Type": "application/json",
    }

    await websocket.send_json({
        "type": "agent_audio_start",
        "sample_rate": 22050,
        "codec": "pcm_s16le",
    })
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes():
                if chunk:
                    await websocket.send_bytes(chunk)
    await websocket.send_json({"type": "agent_audio_end"})


async def _tts_queue_runner(
    queue,
    websocket: WebSocket,
    language: str,
    speaker: str,
    pace: float,
):
    while True:
        sentence = await queue.get()
        if sentence is None:
            queue.task_done()
            return
        try:
            await _stream_sarvam_pcm_to_websocket(sentence, websocket, language, speaker, pace)
        except Exception as exc:
            # Log but don't crash the runner — keep processing remaining sentences
            print(f"TTS runner error for sentence: {exc}")
        finally:
            queue.task_done()


def _build_prompt_with_optional_rag(prompt: str, use_rag: bool) -> str:
    if not use_rag:
        return prompt

    rag_chunks = _query_rag(prompt, n_results=4)
    if not rag_chunks:
        return prompt

    context = "\n--- RAG Context Start ---\n"
    for index, chunk in enumerate(rag_chunks, 1):
        context += f"[Chunk {index}]\n{chunk}\n\n"
    context += "--- RAG Context End ---\n"
    return f"{context}User Query: {prompt}"


@router.websocket("/voice-agent-stream/ws")
async def voice_agent_stream_ws(websocket: WebSocket):
    """
    Stream a text prompt through Groq and Sarvam back to the browser.

    Protocol:
    - Client sends one JSON request with prompt/config fields.
    - Server sends agent_text_delta JSON messages as Groq tokens arrive.
    - Server sends binary PCM audio chunks as Sarvam TTS streams each sentence.
    - Server sends agent_turn_end when both text and audio are complete.
    """
    import asyncio

    await websocket.accept()
    print("[WS] WebSocket connection accepted")

    try:
        request = await websocket.receive_json()
        prompt = (request.get("prompt") or "").strip()
        print(f"[WS] Received prompt: {prompt[:100]}...")
        
        if not prompt:
            print("[WS] ERROR: Prompt is empty")
            await websocket.send_json({"type": "error", "message": "Prompt is required"})
            return
        if async_groq_client is None:
            print("[WS] ERROR: Groq client is None")
            await websocket.send_json({"type": "error", "message": "Groq API key not configured"})
            return
        if not settings.SARVAM_API_KEY:
            print("[WS] ERROR: Sarvam API key not set")
            await websocket.send_json({"type": "error", "message": "Sarvam AI API key not configured"})
            return

        llm_config = get_model_config(request.get("llm_config") or "default")
        tts_config = get_tts_config(request.get("tts_config") or "default")

        model = request.get("model") or llm_config["model"]
        temperature = request.get("temperature")
        if temperature is None:
            temperature = llm_config["temperature"]
        max_tokens = request.get("max_tokens") or llm_config["max_tokens"]
        language = request.get("language") or tts_config["language"]
        speaker = request.get("speaker") or tts_config["speaker"]
        pace = request.get("pace")
        if pace is None:
            pace = tts_config["pace"]
        use_rag = bool(request.get("use_rag", True))
        
        print(f"[WS] Model: {model}, Lang: {language}, Speaker: {speaker}")

        await websocket.send_json({"type": "agent_status", "status": "thinking"})
        prompt_with_context = _build_prompt_with_optional_rag(prompt, use_rag)
        print(f"[WS] Prompt with context ({len(prompt_with_context)} chars)")

        sentence_queue = asyncio.Queue()
        tts_task = asyncio.create_task(
            _tts_queue_runner(sentence_queue, websocket, language, speaker, pace)
        )
        print(f"[WS] TTS task created")

        full_text = ""
        current_sentence = ""
        sentence_delimiters = {".", "?", "!", "\n", "।"}

        print(f"[WS] Calling Groq API...")
        completion = await async_groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": LYRA_SYSTEM_PROMPT},
                {"role": "user", "content": prompt_with_context},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=llm_config["top_p"],
            stream=True,
        )
        print(f"[WS] Groq API call successful, streaming response...")

        await websocket.send_json({"type": "agent_status", "status": "speaking"})
        token_count = 0
        async for chunk in completion:
            token = chunk.choices[0].delta.content or ""
            if not token:
                continue

            token_count += 1
            full_text += token
            current_sentence += token
            print(f"[WS] Token {token_count}: '{token}'")
            await websocket.send_json({"type": "agent_text_delta", "text": token})

            if any(delimiter in token for delimiter in sentence_delimiters) or len(current_sentence) > 180:
                sentence = current_sentence.strip()
                if sentence:
                    print(f"[WS] Queuing sentence: '{sentence[:50]}...'")
                    await sentence_queue.put(sentence)
                current_sentence = ""

        print(f"[WS] Groq streaming complete. Total tokens: {token_count}")
        if current_sentence.strip():
            print(f"[WS] Queuing final sentence: '{current_sentence.strip()[:50]}...'")
            await sentence_queue.put(current_sentence.strip())

        print(f"[WS] Signaling TTS queue end")
        await sentence_queue.put(None)
        await tts_task
        print(f"[WS] TTS task completed. Total response: {len(full_text)} chars")
        await websocket.send_json({"type": "agent_turn_end", "text": full_text})
        print(f"[WS] WebSocket turn end sent successfully")
    except Exception as exc:
        print(f"[WS] ERROR in voice_agent_stream_ws: {type(exc).__name__}: {exc}")
        import traceback
        traceback.print_exc()
        await websocket.send_json({"type": "error", "message": str(exc)})
    finally:
        print(f"[WS] Closing WebSocket")
        await websocket.close()

@router.post("/voice-agent-stream")
async def voice_agent_stream(request: VoiceAgentRequest):
    """
    Complete voice agent pipeline with direct audio streaming
    Returns: text response as JSON + audio stream
    
    Args:
        request: VoiceAgentRequest with prompt and configurations
    
    Returns:
        StreamingResponse with audio data
    """
    try:
        if groq_client is None:
            raise HTTPException(status_code=500, detail="Groq API key not configured")

        # Get LLM config
        llm_config = get_model_config(request.llm_config)
        
        model = request.model or llm_config["model"]
        temperature = request.temperature if request.temperature is not None else llm_config["temperature"]
        max_tokens = request.max_tokens or llm_config["max_tokens"]
        top_p = llm_config["top_p"]
        
        # Step 1: Generate text using Groq
        completion = groq_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": request.prompt,
                }
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
        )
        
        generated_text = completion.choices[0].message.content or ""
        
        # Get TTS config
        tts_config = get_tts_config(request.tts_config)
        
        speaker = request.speaker or tts_config["speaker"]
        language = request.language or tts_config["language"]
        pitch = tts_config["pitch"]
        pace = tts_config["pace"]
        
        # Step 2: Convert generated text to speech using Sarvam AI (STREAMING)
        url = "https://api.sarvam.ai/text-to-speech/stream"
        
        payload = {
            "text": generated_text,
            "target_language_code": language,
            "speaker": speaker,
            "model": "bulbul:v3",
            "pace": pace,
            "enable_preprocessing": True,
            "output_audio_codec": "mp3",
        }
        
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        
        # True streaming - yield audio chunks as they arrive
        async def audio_stream():
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    async with client.stream("POST", url, json=payload, headers=headers) as response:
                        response.raise_for_status()
                        async for chunk in response.aiter_bytes():
                            if chunk:
                                yield chunk
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=502, detail=f"TTS streaming error: {exc}")
        
        return StreamingResponse(
            audio_stream(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=response.mp3",
                "X-Generated-Text": generated_text,
            }
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in voice agent pipeline: {str(e)}")


@router.post("/voice-agent-combined")
async def voice_agent_combined(request: VoiceAgentRequest):
    """
    Voice agent that returns JSON with text + audio stream URL
    This is what the React frontend should use
    
    Args:
        request: VoiceAgentRequest with prompt and configurations
    
    Returns:
        JSON with generated_text and audio_stream endpoint
    """
    try:
        if groq_client is None:
            raise HTTPException(status_code=500, detail="Groq API key not configured")

        # Get LLM config
        llm_config = get_model_config(request.llm_config)
        
        model = request.model or llm_config["model"]
        temperature = request.temperature if request.temperature is not None else llm_config["temperature"]
        max_tokens = request.max_tokens or llm_config["max_tokens"]
        top_p = llm_config["top_p"]
        
        # Step 1: Generate text using Groq
        completion = groq_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": request.prompt,
                }
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
        )
        
        generated_text = completion.choices[0].message.content or ""
        
        # Get TTS config
        tts_config = get_tts_config(request.tts_config)
        
        speaker = request.speaker or tts_config["speaker"]
        language = request.language or tts_config["language"]
        pitch = tts_config["pitch"]
        pace = tts_config["pace"]
        
        # Step 2: Convert generated text to speech using Sarvam AI (STREAMING)
        url = "https://api.sarvam.ai/text-to-speech/stream"
        
        payload = {
            "text": generated_text,
            "target_language_code": language,
            "speaker": speaker,
            "model": "bulbul:v3",
            "pace": pace,
            "enable_preprocessing": True,
            "output_audio_codec": "mp3",
        }
        
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Stream audio and collect all chunks
        audio_chunks = []
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    if chunk:
                        audio_chunks.append(chunk)
        
        # Combine all chunks into final audio
        final_audio = b"".join(audio_chunks)
        
        return {
            "generated_text": generated_text,
            "audio_url": _audio_data_url(final_audio),
            "llm_config_used": request.llm_config,
            "tts_config_used": request.tts_config,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in voice agent pipeline: {str(e)}")


@router.post("/voice-agent-with-rag")
async def voice_agent_with_rag(request: VoiceAgentRequest):
    """
    Voice agent with RAG context injection.
    Queries RAG knowledge base, injects results into Groq prompt, returns JSON + audio URL.
    
    Args:
        request: VoiceAgentRequest with prompt and configurations
    
    Returns:
        JSON with generated_text, audio_url, and rag_chunks_used
    """
    try:
        if groq_client is None:
            raise HTTPException(status_code=500, detail="Groq API key not configured")

        # Step 0: Query RAG for context (graceful fallback if empty)
        rag_chunks = []
        if request.use_rag:
            rag_chunks = _query_rag(request.prompt, n_results=4)
        
        # Build context string
        context = ""
        if rag_chunks:
            context = "\n--- RAG Context Start ---\n"
            for i, chunk in enumerate(rag_chunks, 1):
                context += f"[Chunk {i}]\n{chunk}\n\n"
            context += "--- RAG Context End ---\n"
        
        # Step 1: Generate text using Groq with RAG context
        llm_config = get_model_config(request.llm_config)
        
        model = request.model or llm_config["model"]
        temperature = request.temperature if request.temperature is not None else llm_config["temperature"]
        max_tokens = request.max_tokens or llm_config["max_tokens"]
        top_p = llm_config["top_p"]
        
        # Inject RAG context into prompt
        prompt_with_context = f"{context}User Query: {request.prompt}" if context else request.prompt
        
        completion = groq_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": prompt_with_context,
                }
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
        )
        
        generated_text = completion.choices[0].message.content or ""
        
        # Step 2: Convert generated text to speech using Sarvam AI (STREAMING)
        tts_config = get_tts_config(request.tts_config)
        
        speaker = request.speaker or tts_config["speaker"]
        language = request.language or tts_config["language"]
        pitch = tts_config["pitch"]
        pace = tts_config["pace"]
        
        url = "https://api.sarvam.ai/text-to-speech/stream"
        
        payload = {
            "text": generated_text,
            "target_language_code": language,
            "speaker": speaker,
            "model": "bulbul:v3",
            "pace": pace,
            "enable_preprocessing": True,
            "output_audio_codec": "mp3",
        }
        
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Stream audio and collect all chunks
        audio_chunks = []
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    if chunk:
                        audio_chunks.append(chunk)
        
        # Combine all chunks into final audio
        final_audio = b"".join(audio_chunks)
        
        return {
            "generated_text": generated_text,
            "audio_url": _audio_data_url(final_audio),
            "llm_config_used": request.llm_config,
            "tts_config_used": request.tts_config,
            "rag_chunks_used": rag_chunks,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in voice agent with RAG pipeline: {str(e)}")
