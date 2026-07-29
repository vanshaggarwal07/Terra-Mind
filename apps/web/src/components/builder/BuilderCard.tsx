import type { Builder } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Citation } from "@/components/trust/Citation";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * UP-RERA builder record card — FACTS ONLY.
 * Design system §5, §13: NO trust score, ranking, or evaluative language.
 * Self-check: grep this file for "trust","reliable","risky","rating" → must be zero.
 */
export function BuilderCard({ builder }: { builder: Builder }) {
  return (
    <Card
      title={builder.name}
      actions={
        builder.rera_id ? (
          <Badge tone="accent">RERA {builder.rera_id}</Badge>
        ) : null
      }
    >
      {/* Registration facts — no verdict */}
      {builder.registration_status && (
        <div className="text-sm text-text-mid mb-4">
          <span className="text-text-low">Registration status: </span>
          {builder.registration_status}
        </div>
      )}

      {/* Registered projects */}
      <h4 className="font-display text-xs uppercase tracking-widest text-text-low mb-3 mt-4">
        Registered projects
      </h4>
      {builder.projects.length === 0 ? (
        <p className="text-sm text-text-low">No projects on record.</p>
      ) : (
        <Table columns={["Project", "Status", "Promised", "Actual", "Source"]}>
          {builder.projects.map((p, i) => (
            <tr key={i}>
              <Td>{p.name ?? "-"}</Td>
              <Td>{p.status ?? "-"}</Td>
              <Td>{p.promised_completion ?? "-"}</Td>
              <Td>{p.actual_completion ?? "-"}</Td>
              <Td>
                <Citation citation={p.citation} />
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {/* Delay history — factual records only */}
      {builder.delay_history.length > 0 && (
        <>
          <h4 className="font-display text-xs uppercase tracking-widest text-text-low mb-2 mt-5">
            Delay history (from RERA records)
          </h4>
          <ul className="text-sm text-text-mid space-y-1">
            {builder.delay_history.map((d, i) => (
              <li key={i} className="font-mono text-[12px]">
                {JSON.stringify(d)}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Complaint flags — publicly filed records */}
      {builder.complaint_flags.length > 0 && (
        <>
          <h4 className="font-display text-xs uppercase tracking-widest text-text-low mb-2 mt-5">
            Publicly filed complaints (RERA)
          </h4>
          <ul className="text-sm text-text-mid space-y-1">
            {builder.complaint_flags.map((c, i) => (
              <li key={i} className="font-mono text-[12px]">
                {JSON.stringify(c)}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Source citation */}
      <div className="mt-4">
        <Citation citation={builder.citation} />
      </div>

      {/* Builder disclaimer — always rendered */}
      <div className="mt-3">
        <Disclaimer variant="builder">{builder.disclaimer}</Disclaimer>
      </div>
    </Card>
  );
}
