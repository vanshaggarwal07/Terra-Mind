"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Snapshot = {
  crawl: {
    total: number;
    success: number;
    failure: number;
    success_rate: number;
    by_source: Record<string, Record<string, number>>;
  };
  cache: { decisions: Record<string, number>; hit_rate: number };
  extraction_confidence: {
    count: number;
    avg: number;
    p50: number;
    low_conf_rate: number;
  };
  review_queue: { pending: number };
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        padding: "1rem",
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 12, color: "#777" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default function MetricsDashboard() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/metrics/ingestion`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setData(await res.json());
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
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Ingestion Metrics</h1>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!data ? (
        <p>Loading…</p>
      ) : (
        <>
          <h2>Crawl</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Total runs" value={data.crawl.total} />
            <Stat label="Success" value={data.crawl.success} />
            <Stat label="Failure" value={data.crawl.failure} />
            <Stat
              label="Success rate"
              value={`${(data.crawl.success_rate * 100).toFixed(0)}%`}
            />
          </div>

          <h2>Cache / Verify</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat
              label="Cache hit-rate"
              value={`${(data.cache.hit_rate * 100).toFixed(0)}%`}
            />
            {Object.entries(data.cache.decisions).map(([k, v]) => (
              <Stat key={k} label={k} value={v} />
            ))}
          </div>

          <h2>Extraction confidence</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Extractions" value={data.extraction_confidence.count} />
            <Stat label="Avg" value={data.extraction_confidence.avg} />
            <Stat label="p50" value={data.extraction_confidence.p50} />
            <Stat
              label="Low-conf rate"
              value={`${(data.extraction_confidence.low_conf_rate * 100).toFixed(0)}%`}
            />
          </div>

          <h2>Review queue</h2>
          <div style={{ display: "flex", gap: 12 }}>
            <Stat label="Pending" value={data.review_queue.pending} />
          </div>
        </>
      )}
    </main>
  );
}
