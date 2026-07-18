"""Grounded prompt assembly for the copilot (blueprint §6 step 3)."""

from __future__ import annotations

from api.copilot.schemas import RetrievedContext
from warehouse.schemas import Citation

SYSTEM_PROMPT = (
    "You are the Property Digital Twin copilot for the Noida/Greater Noida/Yamuna "
    "Expressway corridor. Answer ONLY using the CONTEXT provided below. Rules:\n"
    "1. If the context does not contain the answer, say exactly: "
    '"I don\'t have that in my data." Do not use outside knowledge.\n'
    "2. Never compute or invent numbers yourself. For forecasts (price, rent, "
    "appreciation, flood risk, AQI, traffic) you may ONLY repeat a MODEL FORECAST "
    "shown in the context — quote its range and confidence EXACTLY as given and "
    "never a different figure. If no model forecast is in the context, do not give "
    "any predicted number. Factual figures that appear verbatim (e.g. a sanctioned "
    "project budget) may be quoted.\n"
    "3. When you state a forecast, explain it using its listed contributing factors "
    "and cite the model_version.\n"
    "4. For builders, report only the cited UP-RERA facts. Never give a verdict, "
    "rating, or recommendation.\n"
    "5. Cite sources inline using the [n] markers shown in the context.\n"
    "Be concise and factual."
)


def build_context_block(ctx: RetrievedContext) -> tuple[str, list[Citation]]:
    """Render the retrieved context into a numbered, citable text block."""
    lines: list[str] = []
    citations: list[Citation] = []

    def cite(c: Citation) -> int:
        citations.append(c)
        return len(citations)

    if ctx.locality is not None:
        lines.append(f"LOCALITY: {ctx.locality.name}")

    if ctx.facts:
        lines.append("\nVERIFIED INFRASTRUCTURE FACTS:")
        for f in ctx.facts:
            n = cite(f.citation)
            dist = f" ~{f.distance_km:.1f}km" if f.distance_km is not None else ""
            year = f" (expected {f.expected_year})" if f.expected_year else ""
            lines.append(f"- [{n}] {f.status} {f.type}{dist}{year}")

    if ctx.builder is not None:
        n = cite(ctx.builder.citation)
        lines.append(f"\nBUILDER (UP-RERA facts) [{n}]: {ctx.builder.name}")
        if ctx.builder.registration_status:
            lines.append(f"- registration: {ctx.builder.registration_status}")
        for p in ctx.builder.projects:
            lines.append(
                f"- project {p.name or ''}: status={p.status}, "
                f"promised={p.promised_completion}, actual={p.actual_completion}"
            )

    if ctx.predictions:
        lines.append("\nMODEL FORECASTS (quote the range + confidence EXACTLY):")
        for pc in ctx.predictions:
            env = pc.envelope
            if env.has_band():
                band = f"{env.prediction_low}-{env.prediction_high} {env.unit or ''}".strip()
            else:
                band = "no estimate (insufficient data)"
            drivers = ", ".join(f.factor for f in env.contributing_factors[:3]) or "n/a"
            lines.append(
                f"- {pc.domain}: range {band}, confidence {env.confidence}, "
                f"horizon {env.horizon or 'n/a'}, model_version {env.model_version}; "
                f"drivers: {drivers}"
            )

    if ctx.chunks:
        lines.append("\nDOCUMENT EXCERPTS:")
        for ch in ctx.chunks:
            n = cite(ch.citation)
            snippet = ch.text.strip().replace("\n", " ")
            lines.append(f"- [{n}] {snippet[:400]}")

    return "\n".join(lines), citations


def build_user_prompt(query: str, context_block: str) -> str:
    return f"CONTEXT:\n{context_block}\n\nQUESTION: {query}\n\nGrounded answer:"
