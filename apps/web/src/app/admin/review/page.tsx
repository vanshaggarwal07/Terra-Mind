"use client";

import { useCallback, useEffect, useState } from "react";

import {
  decideReview,
  listReview,
  type ReviewItem,
} from "../../../lib/api";

const REVIEWER = "reviewer@twin.local"; // TODO: replace with auth identity

export default function ReviewDashboard() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listReview("pending"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      await decideReview(id, action, REVIEWER);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Review Queue</h1>
      <p style={{ color: "#666" }}>
        Low-confidence and high-stakes extractions. Approving promotes a fact to
        <strong> verified</strong> and makes it user-visible.
      </p>

      <button onClick={() => void load()} disabled={loading}>
        {loading ? "Loading…" : "Refresh"}
      </button>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!loading && items.length === 0 && <p>Nothing pending. 🎉</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{item.entity_type}</strong>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: item.reason === "high_stakes" ? "#fde2e1" : "#fef6e0",
                }}
              >
                {item.reason}
                {item.confidence != null &&
                  ` · conf ${item.confidence.toFixed(2)}`}
              </span>
            </div>
            <pre
              style={{
                background: "#f7f7f7",
                padding: "0.75rem",
                borderRadius: 6,
                overflowX: "auto",
                fontSize: 12,
              }}
            >
              {JSON.stringify(item.entity_ref, null, 2)}
            </pre>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => void decide(item.id, "approve")}
                disabled={busy === item.id}
                style={{ background: "#0a7", color: "#fff", border: 0, padding: "6px 14px", borderRadius: 6 }}
              >
                Approve
              </button>
              <button
                onClick={() => void decide(item.id, "reject")}
                disabled={busy === item.id}
                style={{ background: "#c33", color: "#fff", border: 0, padding: "6px 14px", borderRadius: 6 }}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
