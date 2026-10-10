
"""Add RAG policy tables.

Revision ID: 58e4a617bfca
Revises: Previous Roomly migration
"""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# ==========================================
# ALEMBIC REVISION IDENTIFIERS
revision = "58e4a617bfca"
down_revision = "bce67d7aa9c5"
branch_labels = None
depends_on = None


# ==========================================
# UPGRADE
# ==========================================

def upgrade() -> None:

    # Enable vector support in PostgreSQL.
    op.execute(
        "CREATE EXTENSION IF NOT EXISTS vector"
    )

    # --------------------------------------
    # Table 1: Policy Documents
    # --------------------------------------

    op.create_table(
        "policy_documents",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),

        sa.Column(
            "filename",
            sa.String(length=255),
            nullable=False,
            unique=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # --------------------------------------
    # Table 2: Policy Chunks
    # --------------------------------------

    op.create_table(
        "policy_chunks",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),

        sa.Column(
            "document_id",
            sa.Integer(),
            sa.ForeignKey(
                "policy_documents.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "chunk_index",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "content",
            sa.Text(),
            nullable=False,
        ),

        # Hugging Face all-MiniLM-L6-v2
        # produces 384-dimensional embeddings.
        sa.Column(
            "embedding",
            Vector(384),
            nullable=False,
        ),

        sa.UniqueConstraint(
            "document_id",
            "chunk_index",
            name="uq_policy_document_chunk",
        ),
    )

    # Improve document-based lookups.
    op.create_index(
        "ix_policy_chunks_document_id",
        "policy_chunks",
        ["document_id"],
    )


# ==========================================
# DOWNGRADE
# ==========================================

def downgrade() -> None:

    op.drop_index(
        "ix_policy_chunks_document_id",
        table_name="policy_chunks",
    )

    op.drop_table("policy_chunks")

    op.drop_table("policy_documents")

    # Do not remove the shared vector extension.
