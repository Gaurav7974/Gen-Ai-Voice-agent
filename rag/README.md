# RAG Template with ChromaDB

This folder is a small Retrieval-Augmented Generation template for the voice agent project.
It converts local text/markdown data files into embeddings with ChromaDB and Chroma's default
`all-MiniLM-L6-v2` embedding model, then lets you query the stored chunks.

The template is intentionally standalone so it does not change the existing FastAPI or React app.

## Folder Layout

```text
rag/
├── README.md
├── requirements.txt
├── rag_config.py
├── document_loader.py
├── ingest.py
├── query.py
├── data/
│   └── README.md
└── chroma_store/
    └── README.md
```

## Install

From this folder:

```bash
pip install -r requirements.txt
```

`chromadb` provides the vector database. The default embedding function uses the local
`all-MiniLM-L6-v2` model. The model files may be downloaded automatically on first use.

## Add Data

Put `.txt`, `.md`, or `.markdown` files into `rag/data/`.

Good project-specific examples:

- Voice agent FAQs
- Product or support scripts
- API behavior notes
- Hindi/English voice prompt guidance
- Troubleshooting notes for Groq, Sarvam, or frontend playback

## Ingest Data

```bash
python ingest.py
```

This will:

1. Read supported files from `rag/data/`
2. Split each file into overlapping chunks
3. Create deterministic chunk IDs
4. Upsert chunks into a persistent Chroma collection
5. Store the local Chroma database under `rag/chroma_store/`

## Query Data

```bash
python query.py "How should the voice agent handle interruptions?"
```

The query script prints the nearest chunks with source file metadata and distance scores.

## How This Fits the Voice Agent

The recommended future flow is:

```text
User speech or text
-> STT / transcript
-> RAG query against Chroma
-> retrieved context
-> Groq prompt
-> Sarvam TTS response
```

Keep RAG context short for voice responses. A voice agent should usually retrieve a few
high-signal chunks and then speak a concise answer, not read long documents aloud.

## Notes from Chroma Docs

- Chroma stores documents and metadata in collections.
- Chroma can generate embeddings from documents through a collection embedding function.
- Querying a collection performs nearest-neighbor similarity search.
- Chroma's default embedding function uses `all-MiniLM-L6-v2`.
- Persistent storage should be used when data must survive process restarts.

