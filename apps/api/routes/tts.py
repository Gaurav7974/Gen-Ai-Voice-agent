"""Text-to-speech routes using Sarvam AI."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import httpx

from config import get_tts_config, settings
from schemas import TTSRequest

router = APIRouter(prefix="/api", tags=["Text-to-Speech"])

SARVAM_TTS_STREAM_URL = "https://api.sarvam.ai/text-to-speech/stream"


def build_sarvam_stream_payload(request: TTSRequest) -> dict:
    """Build a Bulbul v3-compatible streaming TTS payload."""
    config = get_tts_config(request.config)

    return {
        "text": request.text,
        "target_language_code": request.language or config["language"],
        "speaker": request.speaker or config["speaker"],
        "model": request.model or config["model"],
        "pace": request.pace if request.pace is not None else config["pace"],
        "speech_sample_rate": request.sample_rate or config["sample_rate"],
        "output_audio_codec": request.audio_codec or config["audio_codec"],
        "enable_preprocessing": True,
    }


@router.post("/synthesize-speech-stream")
async def synthesize_speech_stream(request: TTSRequest):
    """
    Convert text to a streamed MP3 response using Sarvam AI Bulbul v3.

    Returns binary audio directly, so the frontend can create an audio Blob and
    play it without exposing the Sarvam API key to the browser.
    """
    if not settings.SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="Sarvam AI API key not configured")

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = build_sarvam_stream_payload(request)

    async def audio_chunks():
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    SARVAM_TTS_STREAM_URL,
                    headers=headers,
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes():
                        if chunk:
                            yield chunk
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not stream Sarvam AI TTS: {exc}",
            ) from exc

    return StreamingResponse(
        audio_chunks(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=sarvam-output.mp3"},
    )
