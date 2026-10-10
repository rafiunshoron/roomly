
from pathlib import Path
from functools import lru_cache
import sys

from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from sqlalchemy import text

from app.database import SessionLocal


# =====================================
# CONFIGURATION
# =====================================

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# E:/roomly/policies
POLICIES_DIR = Path(__file__).resolve().parents[3] / "policies"

CHUNK_SIZE = 160
CHUNK_OVERLAP = 30


# =====================================
# HUGGING FACE EMBEDDINGS
# =====================================

@lru_cache(maxsize=1)
def get_embedding_model():
    print("Loading Hugging Face embedding model...")
    return SentenceTransformer(MODEL_NAME)


def embed_texts(texts):
    model = get_embedding_model()

    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=True,
    )

    return embeddings.tolist()


def to_vector_literal(embedding):
    return "[" + ",".join(str(x) for x in embedding) + "]"


# =====================================
# PDF TEXT EXTRACTION + CHUNKING
# =====================================

def extract_pdf_chunks(pdf_path):
    reader = PdfReader(str(pdf_path))
    chunks = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        words = page_text.split()

        if not words:
            continue

        step = CHUNK_SIZE - CHUNK_OVERLAP

        for start in range(0, len(words), step):
            chunk_words = words[start:start + CHUNK_SIZE]

            if not chunk_words:
                continue

            chunk = (
                f"[Page {page_number}]\n"
                + " ".join(chunk_words)
            )

            chunks.append(chunk)

            if start + CHUNK_SIZE >= len(words):
                break

    return chunks


# =====================================
# INGEST POLICY DOCUMENTS
# =====================================

def ingest_policies():
    if not POLICIES_DIR.exists():
        raise FileNotFoundError(
            f"Policies directory not found: {POLICIES_DIR}"
        )

    pdf_files = sorted(POLICIES_DIR.glob("*.pdf"))

    if not pdf_files:
        raise RuntimeError("No PDF files found.")

    print(f"Found {len(pdf_files)} policy PDF files.")

    documents = []

    # Prepare all documents before changing database data.
    for pdf_path in pdf_files:
        chunks = extract_pdf_chunks(pdf_path)

        if not chunks:
            raise ValueError(
                f"No extractable text in {pdf_path.name}"
            )

        print(f"{pdf_path.name}: {len(chunks)} chunks")

        embeddings = embed_texts(chunks)

        documents.append(
            (pdf_path.name, chunks, embeddings)
        )

    # All writes are inside one transaction.
    # Re-running ingestion updates existing documents.
    with SessionLocal.begin() as db:
        for filename, chunks, embeddings in documents:
            document_id = db.execute(
                text("""
                    INSERT INTO policy_documents (filename)
                    VALUES (:filename)
                    ON CONFLICT (filename)
                    DO UPDATE SET filename = EXCLUDED.filename
                    RETURNING id
                """),
                {"filename": filename},
            ).scalar_one()

            db.execute(
                text("""
                    DELETE FROM policy_chunks
                    WHERE document_id = :document_id
                """),
                {"document_id": document_id},
            )

            for index, (chunk, embedding) in enumerate(
                zip(chunks, embeddings)
            ):
                db.execute(
                    text("""
                        INSERT INTO policy_chunks (
                            document_id,
                            chunk_index,
                            content,
                            embedding
                        )
                        VALUES (
                            :document_id,
                            :chunk_index,
                            :content,
                            CAST(:embedding AS vector)
                        )
                    """),
                    {
                        "document_id": document_id,
                        "chunk_index": index,
                        "content": chunk,
                        "embedding": to_vector_literal(embedding),
                    },
                )

    print("PDF ingestion completed successfully!")


# =====================================
# VECTOR SIMILARITY SEARCH
# =====================================

def search_policies(query, k=4):
    if not query.strip():
        return []

    query_embedding = embed_texts([query])[0]

    with SessionLocal() as db:
        rows = db.execute(
            text("""
                SELECT
                    d.filename,
                    c.content,
                    1 - (
                        c.embedding <=>
                        CAST(:embedding AS vector)
                    ) AS similarity
                FROM policy_chunks c
                JOIN policy_documents d
                    ON c.document_id = d.id
                ORDER BY
                    c.embedding <=>
                    CAST(:embedding AS vector)
                LIMIT :limit
            """),
            {
                "embedding": to_vector_literal(query_embedding),
                "limit": k,
            },
        ).mappings().all()

    return [
        {
            "source": row["filename"],
            "content": row["content"],
            "similarity": float(row["similarity"]),
        }
        for row in rows
    ]


# =====================================
# COMMAND LINE
# =====================================

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "ingest":
        ingest_policies()

    elif len(sys.argv) > 2 and sys.argv[1] == "search":
        question = " ".join(sys.argv[2:])

        results = search_policies(question)

        for index, result in enumerate(results, start=1):
            print(f"\n--- Result {index} ---")
            print("Source:", result["source"])
            print("Similarity:", round(result["similarity"], 4))
            print("Content:", result["content"][:700])

    else:
        print("Usage:")
        print("python -m app.ai.rag ingest")
        print('python -m app.ai.rag search "your question"')
