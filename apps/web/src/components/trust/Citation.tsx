import type { Citation as CitationType } from "@/lib/api";

/**
 * Inline source citation — every fact, builder record, and copilot answer uses this.
 * Design system §5: "cite sources" is non-negotiable.
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
    <span className="inline-flex items-center gap-1 text-[11px] text-text-low font-mono">
      {prefix}
      {citation.source_document ? (
        <a
          href={citation.source_document}
          target="_blank"
          rel="noreferrer"
          className="text-cyan hover:text-cyan/80 underline underline-offset-2 focus-brass"
        >
          {label}
        </a>
      ) : (
        <span>{label}</span>
      )}
      {asOf && <span className="text-text-low/60">· {asOf}</span>}
    </span>
  );
}
