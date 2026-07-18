"""model registry (Phase 3, P3.2)

Adds the ``model_registry`` table: versioned metadata for trained prediction
models so every served forecast is traceable to a reproducible model version.

Revision ID: 0002_model_registry
Revises: 0001_initial
Create Date: 2026-07-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_model_registry"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "model_registry",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("domain", sa.String(length=40), nullable=False),
        sa.Column("model_version", sa.String(length=120), nullable=False),
        sa.Column("feature_set_version", sa.String(length=120), nullable=False),
        sa.Column("algorithm", sa.String(length=120), nullable=True),
        sa.Column("unit", sa.String(length=60), nullable=True),
        sa.Column("artifact_key", sa.Text(), nullable=True),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("calibration", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("synthetic", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("trained_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "domain", "model_version", name="uq_model_registry_domain_version"
        ),
    )
    op.create_index(
        "ix_model_registry_domain_active", "model_registry", ["domain", "is_active"]
    )


def downgrade() -> None:
    op.drop_index("ix_model_registry_domain_active", table_name="model_registry")
    op.drop_table("model_registry")
