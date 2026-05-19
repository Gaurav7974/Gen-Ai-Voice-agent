"""Speech-to-text routes using Sarvam AI Saaras v3."""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from config import settings

router = APIRouter(prefix="/api", tags=["Speech-to-Text"])

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"


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
    """
    if not settings.SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="Sarvam AI API key not configured")

    import httpx

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")

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

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                SARVAM_STT_URL,
                headers=headers,
                files=files,
                data=data,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Sarvam STT error: {exc}",
            ) from exc
