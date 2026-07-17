"""Section / TOC-aware chunking (blueprint §3.4.2).

Splits at detected section headings (markdown, numbered, or ALL-CAPS lines),
falling back to size-based splitting for oversized sections. Beats fixed-size
chunking for legal/planning documents.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_HEADING_PATTERNS = [
    re.compile(r"^#{1,6}\s+(.+)$"),  # markdown
    re.compile(r"^(\d+(?:\.\d+)*)\s+([A-Z].{3,})$"),  # numbered "3.2 Title"
    re.compile(r"^([A-Z][A-Z0-9 \-&/]{6,})$"),  # ALL CAPS heading
]


@dataclass
class Chunk:
    index: int
    section_title: str
    text: str


def _is_heading(line: str) -> str | None:
    line = line.strip()
    if not line or len(line) > 120:
        return None
    for pat in _HEADING_PATTERNS:
        m = pat.match(line)
        if m:
            return m.groups()[-1].strip()
    return None


def chunk_document(text: str, *, max_chars: int = 4000) -> list[Chunk]:
    lines = text.splitlines()
    sections: list[tuple[str, list[str]]] = []
    current_title = "Introduction"
    current_body: list[str] = []

    for line in lines:
        heading = _is_heading(line)
        if heading is not None:
            if current_body:
                sections.append((current_title, current_body))
            current_title = heading
            current_body = []
        else:
            current_body.append(line)
    if current_body:
        sections.append((current_title, current_body))

    if not sections:
        sections = [("Document", lines)]

    chunks: list[Chunk] = []
    idx = 0
    for title, body in sections:
        body_text = "\n".join(body).strip()
        if not body_text:
            continue
        for piece in _split_by_size(body_text, max_chars):
            chunks.append(Chunk(index=idx, section_title=title, text=piece))
            idx += 1
    return chunks


def _split_by_size(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    pieces: list[str] = []
    paragraphs = text.split("\n\n")
    buf = ""
    for para in paragraphs:
        if len(buf) + len(para) + 2 > max_chars and buf:
            pieces.append(buf.strip())
            buf = ""
        buf += para + "\n\n"
    if buf.strip():
        pieces.append(buf.strip())
    return pieces
