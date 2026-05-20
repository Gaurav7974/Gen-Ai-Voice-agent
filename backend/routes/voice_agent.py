"""Streaming routes for audio using FastAPI"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from groq import Groq
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

# Resolve rag/ directory for RAG queries
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RAG_DIR = PROJECT_ROOT / "rag"


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
        message = groq_client.messages.create(
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
        
        generated_text = message.content[0].text
        
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
        message = groq_client.messages.create(
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
        
        generated_text = message.content[0].text
        
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
            "audio_data": final_audio.hex(),  # Send as hex for JSON response
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
        if getattr(request, "use_rag", True):
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
        
        message = groq_client.messages.create(
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
        
        generated_text = message.content[0].text
        
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
            "audio_data": final_audio.hex(),
            "llm_config_used": request.llm_config,
            "tts_config_used": request.tts_config,
            "rag_chunks_used": rag_chunks,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in voice agent with RAG pipeline: {str(e)}")

