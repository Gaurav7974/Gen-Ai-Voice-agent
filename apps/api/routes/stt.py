"""Speech-to-text routes using Sarvam AI Saaras v3."""
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from config import settings

router = APIRouter(prefix="/api", tags=["Speech-to-Text"])
logger = logging.getLogger(__name__)

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25MB


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    model: str = Form(default="saaras:v3"),
    mode: str = Form(default="transcribe"),
    language_code: str = Form(default=None),
):
    """
    Transcribe audio to text using Sarvam AI Saaras v3.

    Accepts WAV/MP3/OGG/FLAC audio files via multipart form-data.
    Proxies to Sarvam AI STT API so the API key stays server-side.
    
    Args:
        file: Audio file (WAV/MP3/OGG/FLAC)
        model: STT model (default: saaras:v3)
        mode: Transcription mode (default: transcribe)
        language_code: Language code (e.g., hi-IN, ta-IN, en-IN)
        
    Returns:
        Transcription result from Sarvam API
        
    Raises:
        HTTPException: 400 for invalid audio, 500 for config errors, 502 for API errors
    """
    # Validate configuration
    if not settings.SARVAM_API_KEY:
        logger.error("Sarvam AI API key not configured")
        raise HTTPException(status_code=500, detail="Sarvam AI API key not configured")

    # Read and validate audio file
    audio_bytes = await file.read()
    
    if not audio_bytes:
        logger.warning(f"Empty audio file received: {file.filename}")
        raise HTTPException(status_code=400, detail="Audio file is empty")
    
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        logger.warning(f"Audio file too large: {len(audio_bytes)} bytes")
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large. Maximum size: {MAX_AUDIO_SIZE // 1024 // 1024}MB"
        )

    logger.info(
        f"STT request received: file={file.filename}, size={len(audio_bytes)} bytes, "
        f"language={language_code or 'default'}"
    )

    # Build multipart payload matching Sarvam AI's expected format
    files = {
        "file": (file.filename or "audio.wav", audio_bytes, file.content_type or "audio/wav"),
    }
    data = {
        "model": model,
        "mode": mode,
    }
    if language_code:
        data["language_code"] = language_code

    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY,
    }

    import httpx

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                SARVAM_STT_URL,
                headers=headers,
                files=files,
                data=data,
            )
            
            # Log response status
            logger.info(f"Sarvam API response: status={response.status_code}")
            
            # Try to parse error details from Sarvam API response
            if not response.is_success:
                try:
                    error_data = response.json()
                    error_message = error_data.get("error", {}).get("message", response.text)
                    logger.error(f"Sarvam API error: {error_message}")
                except:
                    error_message = response.text
                    logger.error(f"Sarvam API error (raw): {error_message[:200]}")
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Sarvam STT error: {error_message}"
                )
            
            result = response.json()
            logger.info(f"Transcription successful: {len(result.get('transcript', ''))} chars")
            return result
            
        except httpx.HTTPError as exc:
            logger.error(f"HTTP error during STT request: {exc}")
            raise HTTPException(
                status_code=502,
                detail=f"Failed to reach Sarvam AI STT service: {str(exc)}"
            ) from exc
