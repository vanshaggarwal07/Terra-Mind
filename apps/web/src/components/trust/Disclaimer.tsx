/**
 * "Estimate, not investment advice" banner (blueprint §0.2, §13).
 * Any predictive/advisory content must render this.
 */
export function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <div className="disclaimer" role="note">
      <span aria-hidden>⚠️</span>
      <span>
        {children ??
          "This is an estimate derived from public data — not investment advice. Verify every fact against its cited source before acting."}
      </span>
    </div>
  );
}
