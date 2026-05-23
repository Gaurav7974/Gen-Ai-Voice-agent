"""Query the local ChromaDB RAG collection."""
from __future__ import annotations

import argparse

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

from rag_config import CHROMA_DIR, COLLECTION_NAME, DEFAULT_N_RESULTS


def get_collection():
    """Load the local Chroma collection."""
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=DefaultEmbeddingFunction(),
    )


def query_knowledge_base(question: str, n_results: int = DEFAULT_N_RESULTS) -> dict:
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Query the local Chroma RAG collection.")
    parser.add_argument("question", help="Question to search for in the ingested data.")
    parser.add_argument(
        "--n-results",
        type=int,
        default=DEFAULT_N_RESULTS,
        help="Number of chunks to return.",
    )
    args = parser.parse_args()

    results = query_knowledge_base(args.question, args.n_results)
    print_results(results)


if __name__ == "__main__":
    main()

