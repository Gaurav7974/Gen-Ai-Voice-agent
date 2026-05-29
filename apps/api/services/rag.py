"""RAG service: ChromaDB init, document loading, ingestion, and hybrid query."""
from __future__ import annotations

import argparse
import re

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from pathlib import Path
from rank_bm25 import BM25Okapi

from services.rag_config import CHROMA_DIR, COLLECTION_NAME, DEFAULT_N_RESULTS, DATA_DIR
from services.document_loader import load_chunks, DocumentChunk

_RRF_K = 60


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def _rrf_fuse(semantic_ids: list[str], bm25_ids: list[str], k: int = _RRF_K) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for rank, doc_id in enumerate(semantic_ids):
        scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    for rank, doc_id in enumerate(bm25_ids):
        scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


def get_collection():
    """Load or create the local Chroma collection."""
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=DefaultEmbeddingFunction(),
    )


def rag_query(question: str, n_results: int = DEFAULT_N_RESULTS) -> dict:
    """Hybrid BM25 + semantic search over the RAG collection."""
    collection = get_collection()
    empty = {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    all_data = collection.get(include=["documents", "metadatas"])
    all_ids = all_data.get("ids", [])
    all_documents = all_data.get("documents", [])
    all_metadatas = all_data.get("metadatas", [])

    if not all_ids:
        return empty

    candidate_count = min(len(all_ids), max(n_results * 3, n_results))

    semantic = collection.query(
        query_texts=[question],
        n_results=candidate_count,
    )
    semantic_ids = semantic.get("ids", [[]])[0]

    tokenized_corpus = [_tokenize(doc) for doc in all_documents]
    bm25 = BM25Okapi(tokenized_corpus)
    query_tokens = _tokenize(question)
    bm25_scores = bm25.get_scores(query_tokens)
    bm25_ranked = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
    # Filter out documents that do not match query tokens (BM25 score == 0.0)
    bm25_ranked = [i for i in bm25_ranked if bm25_scores[i] != 0.0]
    bm25_ids = [all_ids[i] for i in bm25_ranked[:candidate_count]]

    fused_results = _rrf_fuse(semantic_ids, bm25_ids)[:n_results]
    fused_ids = [item[0] for item in fused_results]

    id_to_doc = dict(zip(all_ids, all_documents))
    id_to_meta = dict(zip(all_ids, all_metadatas))

    # Calculate maximum possible RRF score (rank 1 in both semantic and bm25)
    max_rrf_score = 2.0 / (_RRF_K + 1)

    documents: list[str] = []
    metadatas: list[dict] = []
    distances: list[float] = []
    for rank, (doc_id, rrf_score) in enumerate(fused_results):
        documents.append(id_to_doc[doc_id])
        metadatas.append(id_to_meta.get(doc_id) or {})
        # Normalize distance to range [0.0, 1.0] where 0.0 is a perfect match
        norm_dist = 1.0 - (rrf_score / max_rrf_score)
        distances.append(max(0.0, min(1.0, norm_dist)))

    return {
        "ids": [fused_ids],
        "documents": [documents],
        "metadatas": [metadatas],
        "distances": [distances],
    }


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
