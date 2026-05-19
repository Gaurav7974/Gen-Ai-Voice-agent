# Gen AI Voice Agent

A full-stack voice agent with a FastAPI backend and local RAG knowledge base. Users speak or type a prompt, the system generates a response via Groq LLM, and converts it to speech using Sarvam AI TTS.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   FastAPI        │────▶│   Groq LLM      │
│   (React)       │◀────│   Backend        │────▶│   (Mixtral,     │
│                 │     │                  │     │    Llama, Gemma) │
└─────────────────┘     │                  │     └─────────────────┘
                        │   ├─ STT         │
                        │   ├─ Text Gen    │────▶│   Sarvam AI TTS │
                        │   ├─ TTS Stream  │     │   (Bulbul v3)   │
                        │   └─ Voice Agent │     └─────────────────┘
                        └──────────────────┘
                        
┌─────────────────┐
│   RAG Pipeline  │  (standalone)
│   ChromaDB      │
│   + Doc Loader  │
└─────────────────┘
```

## Project Structure

```
gen ai vocie agent/
├── backend/                 # FastAPI REST API
│   ├── main.py              # App factory, CORS, router registration
│   ├── config.py            # Pydantic settings + preset configs
│   ├── schemas.py           # Pydantic request/response models
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variable template
│   └── routes/
│       ├── __init__.py      # Utility routes (/, /health, /api/configs)
│       ├── stt.py           # Speech-to-text via Sarvam Saaras v3
│       ├── text_generation.py  # Text generation via Groq LLM
│       ├── tts.py           # Streaming TTS via Sarvam Bulbul v3
│       └── voice_agent.py   # Combined LLM + TTS pipeline
│
├── rag/                     # Local RAG knowledge base (standalone)
│   ├── rag_config.py        # Chroma paths, chunking params
│   ├── document_loader.py   # File discovery, text chunking
│   ├── ingest.py            # Upsert chunks into ChromaDB
│   ├── query.py             # CLI similarity search
│   ├── data/                # Drop .txt/.md files here
│   └── chroma_store/        # Persistent ChromaDB storage
│
└── README.md                # This file
```

## Quick Start

### Backend

1. **Create and activate a virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate        # Windows
   # source venv/bin/activate   # Linux/macOS
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure API keys:**
   ```bash
   copy .env.example .env       # Windows
   # cp .env.example .env       # Linux/macOS
   ```
   Edit `.env` and add your `GROQ_API_KEY` and `SARVAM_API_KEY`.

4. **Run the server:**
   ```bash
   uvicorn main:app --reload
   ```
   API docs: http://localhost:8000/docs

### RAG Pipeline

1. **Install dependencies:**
   ```bash
   cd rag
   pip install -r requirements.txt
   ```

2. **Add knowledge files** (`.txt`, `.md`, `.markdown`) to `rag/data/`.

3. **Ingest:**
   ```bash
   python ingest.py
   ```

4. **Query:**
   ```bash
   python query.py "How does the voice agent handle interruptions?"
   ```

## Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Welcome message |
| GET | `/health` | Health check |
| GET | `/api/configs` | List available LLM/TTS presets |
| POST | `/api/generate-text` | Generate text via Groq LLM |
| POST | `/api/synthesize-speech-stream` | Stream TTS audio via Sarvam Bulbul v3 |
| POST | `/api/transcribe` | Transcribe audio via Sarvam Saaras v3 STT |
| POST | `/api/voice-agent-stream` | Full pipeline: prompt → LLM → TTS → audio stream |
| POST | `/api/voice-agent-combined` | Full pipeline: prompt → LLM → TTS → JSON with text + audio URL |

## Configuration

### LLM Presets (Groq)

| Preset | Model | Temperature | Max Tokens | Use Case |
|--------|-------|-------------|------------|----------|
| `default` | mixtral-8x7b-32768 | 0.7 | 1024 | Balanced |
| `creative` | mixtral-8x7b-32768 | 0.9 | 2048 | Creative writing |
| `precise` | mixtral-8x7b-32768 | 0.3 | 1024 | Factual answers |
| `fast` | gemma-7b-it | 0.7 | 512 | Quick responses |
| `detailed` | llama-2-70b-chat-4096 | 0.5 | 4096 | Long-form content |

### TTS Presets (Sarvam Bulbul v3)

| Preset | Speaker | Pitch | Pace | Use Case |
|--------|---------|-------|------|----------|
| `default` | ratan | 1.0 | 1.1 | Standard |
| `calm` | ratan | 0.9 | 0.9 | Relaxing |
| `energetic` | ratan | 1.1 | 1.1 | Upbeat |
| `professional` | ratan | 1.0 | 0.95 | Formal |
| `friendly` | ratan | 1.05 | 1.0 | Warm |

All presets are defined in [`backend/config.py`](backend/config.py). Custom parameters can override any preset value in the request body.

## RAG Integration

The RAG pipeline is standalone — it does not modify the FastAPI app or frontend. The intended future flow:

```
User input → STT transcript → RAG query → retrieved context → Groq prompt (with context) → Sarvam TTS → audio
```

Keep retrieved chunks short. Voice agents should speak concise answers, not read documents aloud.

## Tech Stack

- **Backend**: FastAPI, Uvicorn, Pydantic
- **LLM**: Groq (Mixtral, Llama, Gemma)
- **TTS**: Sarvam AI Bulbul v3
- **STT**: Sarvam AI Saaras v3
- **RAG**: ChromaDB, sentence-transformers (all-MiniLM-L6-v2)
- **HTTP**: httpx (async), requests
