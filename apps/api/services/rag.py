"""RAG service: ChromaDB init, document loading, ingestion, and query."""
from __future__ import annotations

import argparse

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from pathlib import Path

from rag_config import CHROMA_DIR, COLLECTION_NAME, DEFAULT_N_RESULTS, DATA_DIR
from document_loader import load_chunks, DocumentChunk


def get_collection():
    """Load or create the local Chroma collection."""
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=DefaultEmbeddingFunction(),
    )


def rag_query(question: str, n_results: int = DEFAULT_N_RESULTS) -> dict:
    """Run a similarity search over the RAG collection."""
    collection = get_collection()
    return collection.query(
        query_texts=[question],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )


def print_results(results: dict) -> None:
    """Print query results in a compact, voice-agent-friendly format."""
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    if not documents:
        print("No results found. Run ingest.py after adding files to rag/data/.")
        return

    for index, document in enumerate(documents, start=1):
        metadata = metadatas[index - 1] or {}
        distance = distances[index - 1]
        source = metadata.get("source", "unknown")
        chunk_index = metadata.get("chunk_index", "unknown")

        print(f"\nResult {index}")
        print(f"Source: {source} | chunk: {chunk_index} | distance: {distance}")
        print(document)


def rag_ingest() -> int:
    """Load files from data/ and upsert chunks into Chroma, syncing deletions."""
    chunks = load_chunks(DATA_DIR)
    collection = get_collection()

    # Sync deletions: remove sources that no longer exist in the data directory
    try:
        existing = collection.get(include=["metadatas"])
        existing_sources = {
            m.get("source") for m in existing.get("metadatas", [])
            if m and "source" in m
        }
    except Exception:
        existing_sources = set()

    current_sources = {chunk.metadata.get("source") for chunk in chunks}
    deleted_sources = existing_sources - current_sources
    for source in deleted_sources:
        if source:
            collection.delete(where={"source": source})
            print(f"Deleted obsolete source '{source}' from Chroma collection.")

    if not chunks:
        print(f"No supported files found in {DATA_DIR}")
        print("Add .txt, .md, or .markdown files and run this script again.")
        return 0

    collection.upsert(
        ids=[chunk.chunk_id for chunk in chunks],
        documents=[chunk.text for chunk in chunks],
        metadatas=[chunk.metadata for chunk in chunks],
    )

    print(f"Ingested {len(chunks)} chunks into collection '{COLLECTION_NAME}'.")
    print(f"Chroma store: {CHROMA_DIR}")
    return len(chunks)


def main() -> None:
    """CLI entry point: parse args and call rag_query."""
    parser = argparse.ArgumentParser(
        description="Query the local Chroma RAG collection.",
    )
    parser.add_argument("question", help="Question to search for in the ingested data.")
    parser.add_argument(
        "--n-results",
        type=int,
        default=DEFAULT_N_RESULTS,
        help="Number of chunks to return.",
    )
    args = parser.parse_args()

    results = rag_query(args.question, args.n_results)
    print_results(results)


if __name__ == "__main__":
    main()
