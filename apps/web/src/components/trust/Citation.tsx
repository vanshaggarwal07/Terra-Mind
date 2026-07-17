import type { Citation as CitationType } from "@/lib/api";

/**
 * Inline source link + fetch date (blueprint §0: cite sources).
 * Used by facts, the builder card, and copilot answers.
 */
export function Citation({
  citation,
  index,
}: {
  citation: CitationType;
  index?: number;
}) {
  const label = citation.source_name ?? "source";
  const asOf = citation.as_of
    ? new Date(citation.as_of).toISOString().slice(0, 10)
    : null;
  const prefix = index !== undefined ? `[${index}] ` : "";

  return (
    <span className="citation">
      {prefix}
      {citation.source_document ? (
        <a href={citation.source_document} target="_blank" rel="noreferrer">
          {label}
        </a>
      ) : (
        <span>{label}</span>
      )}
      {asOf ? <span className="muted"> · as of {asOf}</span> : null}
    </span>
  );
}
