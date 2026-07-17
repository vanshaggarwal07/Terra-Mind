"""Document parsing (blueprint §3.4.1).

Layout-aware parsing (tables/maps/multi-column) is delegated to a pluggable
``DocumentParser``. A dependency-light default handles HTML/text and PDFs (via
pypdf when available); production should plug in a layout model here.
"""

from __future__ import annotations

from typing import Protocol

from common.logging import get_logger

log = get_logger(__name__)


class DocumentParser(Protocol):
    def to_text(self, content: bytes, content_type: str = "") -> str: ...


class DefaultDocumentParser:
    """Best-effort text extraction. Swap for a layout-aware model in prod."""

    def to_text(self, content: bytes, content_type: str = "") -> str:
        if b"%PDF" in content[:1024] or "pdf" in content_type:
            return self._pdf_to_text(content)
        if "html" in content_type or b"<html" in content[:2048].lower():
            return self._html_to_text(content)
        return content.decode("utf-8", errors="ignore")

    def _pdf_to_text(self, content: bytes) -> str:
        try:
            import io

            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(content))
            return "\n\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception as exc:  # noqa: BLE001
            log.warning("pdf_parse_failed", error=str(exc))
            return content.decode("utf-8", errors="ignore")

    def _html_to_text(self, content: bytes) -> str:
        try:
            from bs4 import BeautifulSoup

            return BeautifulSoup(content, "lxml").get_text("\n", strip=True)
        except Exception:  # noqa: BLE001
            return content.decode("utf-8", errors="ignore")
