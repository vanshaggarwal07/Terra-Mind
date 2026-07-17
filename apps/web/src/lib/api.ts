const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ReviewItem = {
  id: string;
  entity_type: string;
  reason: string;
  status: string;
  confidence: number | null;
  source_id: string | null;
  entity_ref: Record<string, unknown>;
  reviewer: string | null;
  created_at: string | null;
  decided_at: string | null;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function listReview(status = "pending"): Promise<ReviewItem[]> {
  return json(
    await fetch(`${API_BASE}/admin/review?status=${status}`, {
      cache: "no-store",
    }),
  );
}

export async function pendingCount(): Promise<number> {
  const data = await json<{ pending: number }>(
    await fetch(`${API_BASE}/admin/review/count`, { cache: "no-store" }),
  );
  return data.pending;
}

export async function decideReview(
  id: string,
  action: "approve" | "reject",
  reviewer: string,
  edited?: Record<string, unknown>,
): Promise<ReviewItem> {
  return json(
    await fetch(`${API_BASE}/admin/review/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer, edited: edited ?? null }),
    }),
  );
}
