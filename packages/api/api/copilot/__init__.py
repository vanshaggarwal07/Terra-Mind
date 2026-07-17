"""MVP AI Property Copilot (blueprint §1 feature 5, §6).

RAG over the platform's OWN structured facts + cited doc chunks — never the open
web. The LLM explains strictly from retrieved context, refuses when unsupported,
and never emits price/traffic/flood numbers or builder verdicts.
"""

from api.copilot.schemas import ChunkHit, CopilotAnswer, CopilotQuery, RetrievedContext
from api.copilot.service import CopilotService

__all__ = [
    "CopilotService",
    "CopilotQuery",
    "CopilotAnswer",
    "RetrievedContext",
    "ChunkHit",
]
