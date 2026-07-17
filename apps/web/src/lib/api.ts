/**
 * Typed API client for the Property Digital Twin FastAPI backend.
 *
 * Types mirror the FastAPI OpenAPI schema (see `pnpm gen:api` / `npm run gen:api`
 * to regenerate `src/lib/api-types.ts` from the live schema). Every fact carries a
 * `citation`; predictive content carries a `confidence` band and a `disclaimer`.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// --- Shared trust-bearing types (blueprint §0, §5) ---------------------------
export type Citation = {
  source_id: string | null;
  source_name: string | null;
  source_document: string | null;
  as_of: string | null;
};

export type InfraEvent = {
  id: string;
  type: string;
  status: string;
  expected_year: number | null;
  budget_inr_cr: number | null;
  confidence: number;
  source_tier: string;
  lat: number | null;
  lng: number | null;
  locality_id: string | null;
  verified: boolean;
  data_layer: string;
  citation: Citation;
  distance_km: number | null;
};

export type Locality = {
  id: string;
  name: string;
  centroid_lat: number | null;
  centroid_lng: number | null;
  metadata: Record<string, unknown>;
};

export type TimelineResponse = {
  locality_id: string;
  data_layer: string;
  disclaimer: string;
  events: InfraEvent[];
  years: number[];
};

export type InfraEventList = {
  data_layer: string;
  total: number;
  limit: number;
  offset: number;
  items: InfraEvent[];
};

export type ContributingFactor = { factor: string; weight: number };

export type PredictionEnvelope = {
  prediction: number;
  confidence: number;
  contributing_factors: ContributingFactor[];
  model_version: string;
};

export type BuilderProject = {
  name: string | null;
  rera_id: string | null;
  status: string | null;
  promised_completion: string | null;
  actual_completion: string | null;
  citation: Citation;
};

export type Builder = {
  id: string;
  name: string;
  rera_id: string | null;
  registration_status: string | null;
  projects: BuilderProject[];
  delay_history: Record<string, unknown>[];
  complaint_flags: Record<string, unknown>[];
  citation: Citation;
  disclaimer: string;
};

export type ProximityResponse = {
  data_layer: string;
  disclaimer: string;
  lat: number;
  lng: number;
  nearest: Record<string, InfraEvent | null>;
};

export type CopilotAnswer = {
  answer: string;
  citations: Citation[];
  grounded: boolean;
  refused: boolean;
  disclaimer: string;
};

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

// --- fetch helpers -----------------------------------------------------------
async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  return json<T>(res);
}

// --- facts (P2.2) ------------------------------------------------------------
export function listLocalities(limit = 200, offset = 0): Promise<Locality[]> {
  return getJson(`/localities?limit=${limit}&offset=${offset}`);
}

export function getLocality(id: string): Promise<Locality> {
  return getJson(`/localities/${id}`);
}

export function getTimeline(id: string): Promise<TimelineResponse> {
  return getJson(`/localities/${id}/timeline`);
}

export function listInfraEvents(params: {
  type?: string;
  status?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  limit?: number;
} = {}): Promise<InfraEventList> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) q.set(k, String(v));
  });
  return getJson(`/infra-events?${q.toString()}`);
}

// --- score (P2.3) ------------------------------------------------------------
export function getScore(id: string): Promise<PredictionEnvelope> {
  return getJson(`/localities/${id}/score`);
}

// --- proximity (P2.5) --------------------------------------------------------
export function getProximity(id: string): Promise<ProximityResponse> {
  return getJson(`/localities/${id}/proximity`);
}

// --- builder (P2.4) ----------------------------------------------------------
export function getBuilder(id: string): Promise<Builder> {
  return getJson(`/builders/${id}`);
}

export function getBuilderByReraId(reraId: string): Promise<Builder> {
  return getJson(`/builders?rera_id=${encodeURIComponent(reraId)}`);
}

// --- copilot (P2.6) ----------------------------------------------------------
export async function copilotQuery(
  query: string,
  localityId?: string,
): Promise<CopilotAnswer> {
  const res = await fetch(`${API_BASE}/copilot/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, locality_id: localityId ?? null }),
  });
  return json(res);
}

export function copilotStreamUrl(): string {
  return `${API_BASE}/copilot/stream`;
}

// --- review (P1.9) -----------------------------------------------------------
export function listReview(status = "pending"): Promise<ReviewItem[]> {
  return getJson(`/admin/review?status=${status}`);
}

export async function pendingCount(): Promise<number> {
  const data = await getJson<{ pending: number }>(`/admin/review/count`);
  return data.pending;
}

export async function decideReview(
  id: string,
  action: "approve" | "reject",
  reviewer: string,
  edited?: Record<string, unknown>,
): Promise<ReviewItem> {
  const res = await fetch(`${API_BASE}/admin/review/${id}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewer, edited: edited ?? null }),
  });
  return json(res);
}
