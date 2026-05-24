from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file"""

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENV: str = "development"
    API_PREFIX: str = "/api"
    LOG_LEVEL: str = "INFO"

    # API Keys
    GROQ_API_KEY: str = ""
    SARVAM_API_KEY: str

    # Groq LLM Configuration
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 1024
    LLM_TOP_P: float = 1.0

    # Sarvam AI TTS Configuration
    TTS_SPEAKER: str = "ratan"
    TTS_LANGUAGE: str = "hi-IN"
    TTS_MODEL: str = "bulbul:v3"
    TTS_PITCH: float = 1.0
    TTS_PACE: float = 1.1
    TTS_SAMPLE_RATE: int = 22050
    TTS_AUDIO_CODEC: str = "mp3"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


# Load settings
settings = Settings()

# Model configurations for different use cases
MODEL_CONFIGS = {
    "default": {
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.7,
        "max_tokens": 1024,
        "top_p": 1.0,
    },
    "creative": {
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.9,
        "max_tokens": 2048,
        "top_p": 0.95,
    },
    "precise": {
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.3,
        "max_tokens": 1024,
        "top_p": 0.9,
    },
    "fast": {
        "model": "llama-3.1-8b-instant",
        "temperature": 0.7,
        "max_tokens": 512,
        "top_p": 1.0,
    },
    "detailed": {
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.5,
        "max_tokens": 4096,
        "top_p": 0.95,
    },
}

# TTS voice configurations
TTS_CONFIGS = {
    "default": {
        "speaker": "ratan",
        "language": "hi-IN",
        "model": "bulbul:v3",
        "pitch": 1.0,
        "pace": 1.1,
        "sample_rate": 22050,
        "audio_codec": "mp3",
    },
    "calm": {
        "speaker": "ratan",
        "language": "hi-IN",
        "model": "bulbul:v3",
        "pitch": 0.9,
        "pace": 0.9,
        "sample_rate": 22050,
        "audio_codec": "mp3",
    },
    "energetic": {
        "speaker": "ratan",
        "language": "hi-IN",
        "model": "bulbul:v3",
        "pitch": 1.1,
        "pace": 1.1,
        "sample_rate": 22050,
        "audio_codec": "mp3",
    },
    "professional": {
        "speaker": "ratan",
        "language": "hi-IN",
        "model": "bulbul:v3",
        "pitch": 1.0,
        "pace": 0.95,
        "sample_rate": 22050,
        "audio_codec": "mp3",
    },
    "friendly": {
        "speaker": "ratan",
        "language": "hi-IN",
        "model": "bulbul:v3",
        "pitch": 1.05,
        "pace": 1.0,
        "sample_rate": 22050,
        "audio_codec": "mp3",
    },
}


def get_model_config(config_name: str = "default") -> dict:
    """Get model configuration by name"""
    return MODEL_CONFIGS.get(config_name, MODEL_CONFIGS["default"])


def get_tts_config(config_name: str = "default") -> dict:
    """Get TTS configuration by name"""
    return TTS_CONFIGS.get(config_name, TTS_CONFIGS["default"])


def get_available_model_configs() -> list:
    """Get list of available model configurations"""
    return list(MODEL_CONFIGS.keys())


def get_available_tts_configs() -> list:
    """Get list of available TTS configurations"""
    return list(TTS_CONFIGS.keys())
