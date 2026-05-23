"""Save Sarvam AI streaming text-to-speech output to an MP3 file."""
import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SARVAM_API_KEY")
API_URL = "https://api.sarvam.ai/text-to-speech/stream"


def stream_tts(
    text: str = "Hello! This is a streaming text-to-speech example.",
    output_path: str = "output.mp3",
) -> None:
    """Stream Sarvam AI TTS audio chunks and save them to an MP3 file."""
    if not API_KEY:
        raise RuntimeError("SARVAM_API_KEY is not set in .env")

    headers = {
        "api-subscription-key": API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "text": text,
        "target_language_code": "hi-IN",
        "speaker": "ratan",
        "model": "bulbul:v3",
        "pace": 1.1,
        "speech_sample_rate": 22050,
        "output_audio_codec": "mp3",
        "enable_preprocessing": True,
    }

    with requests.post(
        API_URL,
        headers=headers,
        json=payload,
        stream=True,
        timeout=60,
    ) as response:
        response.raise_for_status()

        with open(output_path, "wb") as audio_file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    audio_file.write(chunk)
                    print(f"Received {len(chunk)} bytes")

    print(f"Audio saved to {output_path}")


if __name__ == "__main__":
    stream_tts()
