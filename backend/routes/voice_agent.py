"""Streaming routes for audio using FastAPI"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from groq import Groq
import httpx
import io
from config import settings, get_model_config, get_tts_config
from schemas import VoiceAgentRequest

router = APIRouter(prefix="/api", tags=["Voice Agent Stream"])

# Initialize Groq client when configured.
groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None

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
        
        # Step 2: Convert generated text to speech using Sarvam AI
        url = "https://api.sarvam.ai/text-to-speech"
        
        payload = {
            "inputs": [generated_text],
            "target_language_code": language,
            "speaker": speaker,
            "pitch": pitch,
            "pace": pace,
            "enable_preprocessing": True,
        }
        
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            tts_response = await client.post(url, json=payload, headers=headers)
            tts_response.raise_for_status()
            
            result = tts_response.json()
            audio_url = result.get("audios", [{}])[0].get("audio_url", "")
            
            if not audio_url:
                raise Exception("No audio URL in response")
            
            # Fetch the audio stream
            audio_response = await client.get(audio_url)
            audio_response.raise_for_status()
            audio_data = audio_response.content
        
        # Create a streaming response with the audio data
        def generate():
            yield audio_data
        
        return StreamingResponse(
            generate(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=response.mp3",
                "X-Generated-Text": generated_text,  # Include text in header for client to parse
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
        
        # Step 2: Convert generated text to speech using Sarvam AI
        url = "https://api.sarvam.ai/text-to-speech"
        
        payload = {
            "inputs": [generated_text],
            "target_language_code": language,
            "speaker": speaker,
            "pitch": pitch,
            "pace": pace,
            "enable_preprocessing": True,
        }
        
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            tts_response = await client.post(url, json=payload, headers=headers)
            tts_response.raise_for_status()
            
            result = tts_response.json()
            audio_url = result.get("audios", [{}])[0].get("audio_url", "")
            
            if not audio_url:
                raise Exception("No audio URL in response")
        
        return {
            "generated_text": generated_text,
            "audio_url": audio_url,
            "llm_config_used": request.llm_config,
            "tts_config_used": request.tts_config,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in voice agent pipeline: {str(e)}")
