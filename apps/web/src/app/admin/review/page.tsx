"use client";

import { useCallback, useEffect, useState } from "react";
import { decideReview, listReview, type ReviewItem } from "@/lib/api";
import { cn } from "@/lib/cn";

const REVIEWER = "reviewer@twin.local";

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

  useEffect(() => { void load(); }, [load]);

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
    <main className="max-w-4xl mx-auto px-6 md:px-12 py-12">
      <div className="mb-8">
        <h1 className="font-display font-medium text-[clamp(24px,3vw,36px)] text-text-hi mb-2">
          Review queue
        </h1>
        <p className="text-sm text-text-mid">
          Low-confidence and high-stakes extractions. Approving promotes a fact to{" "}
          <strong className="text-moss">verified</strong> and makes it user-visible.
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => void load()}
          disabled={loading}
          className={cn(
            "px-4 py-2 border border-white/10 rounded-card text-sm text-text-mid",
            "hover:border-cyan/30 transition-colors focus-brass",
            "disabled:opacity-40",
          )}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-clay mb-4">Error: {error}</p>
      )}
      {!loading && items.length === 0 && (
        <p className="text-sm text-moss">Nothing pending - queue is clear.</p>
      )}

      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="border border-white/[0.08] rounded-card p-4 bg-ink-2"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-display font-medium text-sm text-text-hi">
                {item.entity_type}
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] border rounded-sm px-2 py-0.5",
                  item.reason === "high_stakes"
                    ? "text-clay border-clay/30"
                    : "text-brass-light border-brass/30",
                )}
              >
                {item.reason}
                {item.confidence != null &&
                  ` · conf ${item.confidence.toFixed(2)}`}
              </span>
            </div>
            <pre className="bg-ink-3 p-3 rounded-card overflow-x-auto font-mono text-[11px] text-text-mid mb-3 max-h-48">
              {JSON.stringify(item.entity_ref, null, 2)}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={() => void decide(item.id, "approve")}
                disabled={busy === item.id}
                className={cn(
                  "px-4 py-2 bg-moss/20 text-moss border border-moss/30 rounded-card text-sm",
                  "hover:bg-moss/30 transition-colors focus-brass",
                  "disabled:opacity-40",
                )}
              >
                Approve
              </button>
              <button
                onClick={() => void decide(item.id, "reject")}
                disabled={busy === item.id}
                className={cn(
                  "px-4 py-2 bg-clay/10 text-clay border border-clay/30 rounded-card text-sm",
                  "hover:bg-clay/20 transition-colors focus-brass",
                  "disabled:opacity-40",
                )}
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
