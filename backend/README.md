# Voice Agent Backend

FastAPI-based backend for the Gen AI Voice Agent application with Groq LLM and Sarvam AI TTS.

## Setup

### 1. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
```

Update `.env` with your API keys:
- `GROQ_API_KEY` - Get from [Groq Console](https://console.groq.com)
- `SARVAM_API_KEY` - Get from [Sarvam AI](https://sarvam.ai)

### 4. Run the server
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
backend/
├── main.py                      # FastAPI app factory
├── config.py                    # Configuration management and presets
├── schemas.py                   # Pydantic models for request/response
├── requirements.txt             # Python dependencies
├── .env.example                 # Example environment variables
├── README.md                    # This file
└── routes/
    ├── __init__.py             # Utility routes (configs, health)
    ├── text_generation.py      # Groq LLM text generation routes
    ├── tts.py                  # Sarvam AI TTS routes
    └── voice_agent.py          # Combined voice agent routes
```

## Configuration System

All model parameters (temperature, max_tokens, etc.) are managed through `config.py`.

### Pre-built Configurations

**LLM Configurations:**
- `default` - Balanced performance
- `creative` - Higher temperature, more tokens for creative output
- `precise` - Lower temperature for consistent output
- `fast` - Faster model with fewer tokens
- `detailed` - Larger model with more output tokens

**TTS Configurations:**
- `default` - Standard female voice
- `calm` - Slower pace, lower pitch
- `energetic` - Faster pace, higher pitch
- `professional` - Male voice, professional tone
- `friendly` - Warm, welcoming tone

### Get Available Configurations
**GET** `/api/configs`

Response:
```json
{
  "model_configs": ["default", "creative", "precise", "fast", "detailed"],
  "tts_configs": ["default", "calm", "energetic", "professional", "friendly"]
}
```

## API Endpoints

### 1. Generate Text (Groq LLM)
**POST** `/api/generate-text`

Request with preset config:
```json
{
  "prompt": "What is the capital of France?",
  "config": "default"
}
```

Request with custom parameters:
```json
{
  "prompt": "Write a creative story",
  "config": "creative",
  "temperature": 0.95,
  "max_tokens": 2048
}
```

Response:
```json
{
  "text": "The capital of France is Paris...",
  "model": "mixtral-8x7b-32768",
  "stop_reason": "end_turn",
  "config_used": "default"
}
```

**Config Options:**
- `config` (string): Use preset: "default", "creative", "precise", "fast", "detailed"
- `model` (string, optional): Override the model
- `temperature` (float, optional): 0.0-2.0, default varies by config
- `max_tokens` (int, optional): Override max tokens
- `top_p` (float, optional): 0.0-1.0

---

### 2. Synthesize Speech (Sarvam AI TTS)
**POST** `/api/synthesize-speech`

Request with preset config:
```json
{
  "text": "Hello, this is a voice message.",
  "config": "default"
}
```

Request with custom parameters:
```json
{
  "text": "This is energetic!",
  "config": "energetic",
  "pitch": 1.2
}
```

Response:
```json
{
  "audio_url": "https://...",
  "format": "mp3",
  "config_used": "energetic"
}
```

**Config Options:**
- `config` (string): Use preset: "default", "calm", "energetic", "professional", "friendly"
- `speaker` (string, optional): "male" or "female"
- `language` (string, optional): e.g., "en-US"
- `pitch` (float, optional): 0.5-2.0, default varies by config
- `pace` (float, optional): 0.5-2.0, default varies by config

---

### 3. Complete Voice Agent (Text + TTS)
**POST** `/api/voice-agent`

Request:
```json
{
  "prompt": "Tell me a short joke",
  "llm_config": "creative",
  "tts_config": "friendly"
}
```

With custom overrides:
```json
{
  "prompt": "Explain quantum computing",
  "llm_config": "detailed",
  "tts_config": "professional",
  "temperature": 0.5,
  "max_tokens": 3000
}
```

Response:
```json
{
  "generated_text": "Why did the programmer quit...",
  "audio_url": "https://...",
  "llm_config_used": "creative",
  "tts_config_used": "friendly"
}
```

---

### 4. Get Available Configurations
**GET** `/api/configs`

Response:
```json
{
  "model_configs": ["default", "creative", "precise", "fast", "detailed"],
  "tts_configs": ["default", "calm", "energetic", "professional", "friendly"]
}
```

---

### 5. Health Check
**GET** `/health`

Response:
```json
{
  "status": "healthy",
  "environment": "development"
}
```

---

## File Descriptions

### `main.py`
- Contains the FastAPI app factory `create_app()`
- Configures CORS middleware
- Includes all route routers

### `config.py`
- `Settings` class: Environment variable configuration using Pydantic
- `MODEL_CONFIGS`: Dictionary of preset LLM configurations
- `TTS_CONFIGS`: Dictionary of preset TTS voice configurations
- Helper functions: `get_model_config()`, `get_tts_config()`, `get_available_model_configs()`, `get_available_tts_configs()`

### `schemas.py`
- Pydantic models for request/response validation
- `TextGenerationRequest/Response`
- `TTSRequest/Response`
- `VoiceAgentRequest/Response`
- `ConfigsResponse`

### `routes/` Directory
Each file handles a specific domain:

- **`__init__.py`** - Utility routes (root, health check, configs)
- **`text_generation.py`** - Groq LLM integration for text generation
- **`tts.py`** - Sarvam AI integration for text-to-speech
- **`voice_agent.py`** - Combined pipeline (text generation + TTS)

## Preset LLM Configurations

| Config | Temperature | Max Tokens | Model | Use Case |
|--------|-------------|-----------|-------|----------|
| default | 0.7 | 1024 | mixtral-8x7b-32768 | Balanced |
| creative | 0.9 | 2048 | mixtral-8x7b-32768 | Creative writing |
| precise | 0.3 | 1024 | mixtral-8x7b-32768 | Factual answers |
| fast | 0.7 | 512 | gemma-7b-it | Quick responses |
| detailed | 0.5 | 4096 | llama-2-70b-chat-4096 | Long-form content |

## Preset TTS Configurations

| Config | Speaker | Pitch | Pace | Use Case |
|--------|---------|-------|------|----------|
| default | female | 1.0 | 1.0 | Normal |
| calm | female | 0.9 | 0.9 | Relaxing |
| energetic | male | 1.1 | 1.1 | Upbeat |
| professional | male | 1.0 | 0.95 | Formal |
| friendly | female | 1.05 | 1.0 | Warm |

## Development

- Hot reload enabled with `--reload` flag
- CORS configured to allow all origins (update for production)
- All endpoints documented in Swagger UI at `/docs`
- Type hints and validation using Pydantic models
- Configuration management through `config.py`
- Clean separation of concerns with modular routes

## Customizing Configurations

To add new configurations, edit `config.py`:

```python
MODEL_CONFIGS = {
    "your_config": {
        "model": "mixtral-8x7b-32768",
        "temperature": 0.5,
        "max_tokens": 2000,
        "top_p": 0.95,
    },
    # ... existing configs
}

TTS_CONFIGS = {
    "your_voice": {
        "speaker": "male",
        "language": "en-US",
        "pitch": 1.1,
        "pace": 0.95,
    },
    # ... existing configs
}
```

The new configurations will automatically be available via `/api/configs` and can be used with any endpoint that accepts a `config` parameter.

## Available Models (Groq)

- `mixtral-8x7b-32768` - Fast, versatile, recommended
- `llama-2-70b-chat-4096` - Large, detailed responses
- `gemma-7b-it` - Fast, efficient

For the latest available models, check [Groq Console](https://console.groq.com)
