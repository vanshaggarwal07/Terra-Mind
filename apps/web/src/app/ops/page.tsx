"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Health = {
  status: string;
  services: Record<string, string>;
  models_trained: string[];
};

type CostItem = {
  name: string;
  enabled: boolean;
  spend_usd: number;
  cap_usd: number;
  remaining_usd: number;
  over_cap: boolean;
  allowed: boolean;
  burn_rate: number;
};

type Metrics = {
  crawl: { total: number; success: number; failure: number; success_rate: number };
  cache: { hit_rate: number };
  extraction_confidence: { avg: number; low_conf_rate: number };
  review_queue: { pending: number | null };
  models: Record<string, { model_version: string; metrics: Record<string, number> } | null>;
  costs: CostItem[];
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: "1rem", minWidth: 140 }}>
      <div style={{ fontSize: 12, color: "#777" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function statusColor(s: string): string {
  return s === "ok" ? "#0a7d33" : s === "degraded" ? "#b58900" : "#b00020";
}

export default function OpsDashboard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [h, m] = await Promise.all([
        fetch(`${API_BASE}/ops/health`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`${API_BASE}/ops/metrics`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setHealth(h);
      setMetrics(m);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Operations</h1>
      <p style={{ color: "#777" }}>
        Consolidated ingestion · review · ML · cost · API health (Phase 5).
      </p>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {health && (
        <>
          <h2>Service health</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(health.services).map(([svc, st]) => (
              <div key={svc} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: "0.75rem 1rem" }}>
                <span style={{ color: statusColor(st), fontWeight: 700 }}>●</span> {svc}: {st}
              </div>
            ))}
          </div>
        </>
      )}

      {metrics && (
        <>
          <h2>Ingestion</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Crawl success" value={`${(metrics.crawl.success_rate * 100).toFixed(0)}%`} />
            <Stat label="Cache hit-rate" value={`${(metrics.cache.hit_rate * 100).toFixed(0)}%`} />
            <Stat label="Extraction avg conf" value={metrics.extraction_confidence.avg} />
            <Stat label="Review pending" value={metrics.review_queue.pending ?? "n/a"} />
          </div>

          <h2>Models</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(metrics.models).map(([domain, m]) => (
              <Stat
                key={domain}
                label={domain}
                value={m ? Object.values(m.metrics)[0] ?? "trained" : "—"}
              />
            ))}
          </div>

          <h2>Cost guards</h2>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>Line item</th>
                <th>Enabled</th>
                <th>Spend</th>
                <th>Cap</th>
                <th>Burn</th>
                <th>Allowed</th>
              </tr>
            </thead>
            <tbody>
              {metrics.costs.map((c) => (
                <tr key={c.name} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td>{c.name}</td>
                  <td>{c.enabled ? "yes" : "off"}</td>
                  <td>${c.spend_usd.toFixed(2)}</td>
                  <td>${c.cap_usd.toFixed(2)}</td>
                  <td style={{ color: c.burn_rate > 0.8 ? "#b00020" : "#333" }}>
                    {(c.burn_rate * 100).toFixed(0)}%
                  </td>
                  <td style={{ color: c.allowed ? "#0a7d33" : "#b00020" }}>
                    {c.allowed ? "yes" : "blocked"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
