# Gen AI Voice Agent (Lyra)

A full-stack, voice-first AI for Indic languages. Users speak or type in Hindi, Tamil, Telugu and 8+ other Indic languages; the system transcribes via Sarvam STT, generates a grounded response via Groq LLM + RAG, and streams audio back via Sarvam TTS.

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────┐     ┌─────────────────┐
│  apps/web        │────▶│  apps/api  (FastAPI)             │────▶│  Groq LLM       │
│  React + Vite    │◀────│  app/api/routes/                 │     │  (Mixtral, etc) │
│  TypeScript      │     │  ├─ stt.py   (Sarvam Saaras v3) │     └─────────────────┘
└─────────────────┘     │  ├─ tts.py   (Sarvam Bulbul v3) │────▶│  Sarvam AI TTS  │
                        │  ├─ voice_agent.py               │     └─────────────────┘
                        │  └─ rag.py   (ChromaDB + BM25)  │
                        │  app/services/   (RAG, doc load) │
                        │  app/db/         (Chroma client) │
                        └──────────────────────────────────┘
```

## Project Structure

```
gen-ai-voice-agent/
├── apps/
│   ├── api/                       # FastAPI backend
│   │   ├── requirements.txt
│   │   ├── .env / .env.example
│   │   └── app/
│   │       ├── main.py            # App factory, CORS, router registration
│   │       ├── config.py          # Pydantic settings + preset configs
│   │       ├── schemas.py         # Pydantic request/response models
│   │       ├── sarvam_tts_stream.py
│   │       ├── api/routes/        # Route handlers
│   │       │   ├── rag.py
│   │       │   ├── stt.py
│   │       │   ├── text_generation.py
│   │       │   ├── tts.py
│   │       │   ├── voice_agent.py
│   │       │   └── utils.py
│   │       ├── services/          # Business logic
│   │       │   ├── document_loader.py
│   │       │   ├── rag.py
│   │       │   ├── rag_config.py
│   │       │   └── tts.py
│   │       └── db/                # Database clients
│   │           ├── chroma.py
│   │           └── chroma_ingest.py
│   └── web/                       # React + Vite frontend
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── api.ts
│           └── (pages, components, styles...)
├── knowledge/
│   └── docs/                      # Drop .txt/.md knowledge files here
│       └── secret.txt
├── tests/
│   ├── test_rag_routes.py
│   └── test_document_loader.py
├── CLAUDE.md
├── DESIGN.md
├── pytest.ini
└── README.md
```

## Quick Start

### API (Backend)

```bash
cd apps/api
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
copy .env.example .env       # then add your API keys
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### Web (Frontend)

```bash
cd apps/web
npm install
npm run dev
```

## API Endpoints

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

All presets are defined in `apps/api/app/config.py`. Custom parameters can override any preset value in the request body.

## RAG Integration

The RAG pipeline is embedded in `apps/api/app/services/rag.py` and `app/db/`. To add knowledge:

1. Drop `.txt` or `.md` files into `knowledge/docs/`
2. Run ingestion: `python apps/api/rag/scripts/ingest.py`

The intended voice flow:
```
User input -> STT -> RAG query -> retrieved context -> Groq (with context) -> Sarvam TTS -> audio
```

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Clerk auth
- **Backend**: FastAPI, Uvicorn, Pydantic
- **LLM**: Groq (Mixtral, Llama, Gemma)
- **TTS**: Sarvam AI Bulbul v3
- **STT**: Sarvam AI Saaras v3
- **RAG**: ChromaDB, sentence-transformers (all-MiniLM-L6-v2)
- **HTTP**: httpx (async), requests
