import type { Builder } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { Citation } from "@/components/trust/Citation";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * UP-RERA builder record card (blueprint §1 feature 4, §0, §13).
 * Verbatim regulator facts with citations. NO trust score / ranking / verdict —
 * only cited facts + a disclaimer.
 */
export function BuilderCard({ builder }: { builder: Builder }) {
  return (
    <Card
      title={builder.name}
      actions={builder.rera_id ? <Badge tone="accent">RERA {builder.rera_id}</Badge> : null}
    >
      {builder.registration_status && (
        <p>
          <span className="muted">Registration status: </span>
          {builder.registration_status}
        </p>
      )}

      <h4>Registered projects</h4>
      {builder.projects.length === 0 ? (
        <p className="muted">No projects on record.</p>
      ) : (
        <Table columns={["Project", "Status", "Promised", "Actual", "Source"]}>
          {builder.projects.map((p, i) => (
            <tr key={i}>
              <td>{p.name ?? "—"}</td>
              <td>{p.status ?? "—"}</td>
              <td>{p.promised_completion ?? "—"}</td>
              <td>{p.actual_completion ?? "—"}</td>
              <td>
                <Citation citation={p.citation} />
              </td>
            </tr>
          ))}
        </Table>
      )}

      {builder.delay_history.length > 0 && (
        <>
          <h4>Delay history</h4>
          <ul>
            {builder.delay_history.map((d, i) => (
              <li key={i}>{JSON.stringify(d)}</li>
            ))}
          </ul>
        </>
      )}

      {builder.complaint_flags.length > 0 && (
        <>
          <h4>Complaint / litigation flags</h4>
          <ul>
            {builder.complaint_flags.map((c, i) => (
              <li key={i}>{JSON.stringify(c)}</li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <Citation citation={builder.citation} />
      </div>
      <div style={{ marginTop: 12 }}>
        <Disclaimer>{builder.disclaimer}</Disclaimer>
      </div>
    </Card>
  );
}
