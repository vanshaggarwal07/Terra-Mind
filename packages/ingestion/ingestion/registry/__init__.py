"""Source registry: sources are DATA (rows), never hardcoded logic (blueprint §3.1)."""

from ingestion.registry.schemas import SourceCreate, SourceRead, SourceUpdate

__all__ = ["SourceCreate", "SourceRead", "SourceUpdate"]
