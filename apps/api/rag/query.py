"""Query the local ChromaDB RAG collection (legacy CLI entry point).

Imports from services for actual logic.
"""
import sys
from pathlib import Path

# Allow running as a script from apps/api/rag/
api_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(api_dir))
sys.path.insert(0, str(api_dir / "services"))

from services.rag import rag_query
from services.rag import print_results


def main() -> None:
    """Parse CLI args and call rag_query."""
    import argparse

    parser = argparse.ArgumentParser(description="Query the local Chroma RAG collection.")
    parser.add_argument("question", help="Question to search for in the ingested data.")
    parser.add_argument(
        "--n-results",
        type=int,
        default=4,
        help="Number of chunks to return.",
    )
    args = parser.parse_args()

    results = rag_query(args.question, args.n_results)
    print_results(results)


if __name__ == "__main__":
    main()
