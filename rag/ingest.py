"""Ingest local files into a persistent ChromaDB collection."""

from __future__ import annotations

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from document_loader import load_chunks
from rag_config import CHROMA_DIR, COLLECTION_NAME, DATA_DIR


def get_collection():
    """Create or load the local Chroma collection."""
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=DefaultEmbeddingFunction(),
        metadata={"description": "Voice agent RAG knowledge base"},
    )


def ingest() -> int:
    """Load files from data/ and upsert chunks into Chroma."""
    chunks = load_chunks(DATA_DIR)
    if not chunks:
        print(f"No supported files found in {DATA_DIR}")
        print("Add .txt, .md, or .markdown files and run this script again.")
        return 0

    collection = get_collection()
    collection.upsert(
        ids=[chunk.chunk_id for chunk in chunks],
        documents=[chunk.text for chunk in chunks],
        metadatas=[chunk.metadata for chunk in chunks],
    )

    print(f"Ingested {len(chunks)} chunks into collection '{COLLECTION_NAME}'.")
    print(f"Chroma store: {CHROMA_DIR}")
    return len(chunks)


# wrapper
if __name__ == "__main__":
    ingest()
