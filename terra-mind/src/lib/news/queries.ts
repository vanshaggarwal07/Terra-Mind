import { sql } from "@/lib/db";
import type { NewsCategory, NewsSourceType, StoredNewsItem } from "./types";

type NewsRow = {
  id: string;
  headline: string;
  body: string | null;
  source_name: string;
  source_url: string;
  published_at: string | Date | null;
  fetched_at: string | Date;
  category: string | null;
  source_type: string;
};

function mapRow(row: NewsRow): StoredNewsItem {
  return {
    id: String(row.id),
    headline: row.headline,
    body: row.body,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    publishedAt: row.published_at
      ? new Date(row.published_at).toISOString()
      : null,
    fetchedAt: new Date(row.fetched_at).toISOString(),
    category: row.category,
    sourceType: row.source_type as NewsSourceType,
  };
}

export async function listNewsItems(opts: {
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: StoredNewsItem[]; page: number; limit: number; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  // High cap so the feed can show accumulated history, not only the latest page
  const limit = Math.min(1000, Math.max(1, opts.limit ?? 500));
  const offset = (page - 1) * limit;
  const category = opts.category?.trim() || undefined;
  const q = opts.q?.trim() || undefined;
  const like = q ? `%${q.toLowerCase()}%` : undefined;

  let rows: NewsRow[];
  let total: number;

  if (category && category !== "all" && like) {
    const countRows = await sql<{ count: string | number }>`
      SELECT COUNT(*)::int AS count FROM news_items
      WHERE category = ${category}
        AND (
          lower(headline) LIKE ${like}
          OR lower(coalesce(body, '')) LIKE ${like}
          OR lower(source_name) LIKE ${like}
        )
    `;
    total = Number(countRows[0]?.count ?? 0);
    rows = await sql<NewsRow>`
      SELECT id, headline, body, source_name, source_url, published_at, fetched_at, category, source_type
      FROM news_items
      WHERE category = ${category}
        AND (
          lower(headline) LIKE ${like}
          OR lower(coalesce(body, '')) LIKE ${like}
          OR lower(source_name) LIKE ${like}
        )
      ORDER BY COALESCE(published_at, fetched_at) DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (category && category !== "all") {
    const countRows = await sql<{ count: string | number }>`
      SELECT COUNT(*)::int AS count FROM news_items WHERE category = ${category}
    `;
    total = Number(countRows[0]?.count ?? 0);
    rows = await sql<NewsRow>`
      SELECT id, headline, body, source_name, source_url, published_at, fetched_at, category, source_type
      FROM news_items
      WHERE category = ${category}
      ORDER BY COALESCE(published_at, fetched_at) DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (like) {
    const countRows = await sql<{ count: string | number }>`
      SELECT COUNT(*)::int AS count FROM news_items
      WHERE
        lower(headline) LIKE ${like}
        OR lower(coalesce(body, '')) LIKE ${like}
        OR lower(source_name) LIKE ${like}
    `;
    total = Number(countRows[0]?.count ?? 0);
    rows = await sql<NewsRow>`
      SELECT id, headline, body, source_name, source_url, published_at, fetched_at, category, source_type
      FROM news_items
      WHERE
        lower(headline) LIKE ${like}
        OR lower(coalesce(body, '')) LIKE ${like}
        OR lower(source_name) LIKE ${like}
      ORDER BY COALESCE(published_at, fetched_at) DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    const countRows = await sql<{ count: string | number }>`
      SELECT COUNT(*)::int AS count FROM news_items
    `;
    total = Number(countRows[0]?.count ?? 0);
    rows = await sql<NewsRow>`
      SELECT id, headline, body, source_name, source_url, published_at, fetched_at, category, source_type
      FROM news_items
      ORDER BY COALESCE(published_at, fetched_at) DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return {
    items: rows.map(mapRow),
    page,
    limit,
    total,
  };
}

export async function getSyncStatus(): Promise<{
  lastSyncedAt: string | null;
  lastSyncOk: boolean | null;
  counts: { government: number; news: number; x: number; total: number };
  perSource: unknown;
}> {
  const countRows = await sql<{ source_type: string; count: string | number }>`
    SELECT source_type, COUNT(*)::int AS count
    FROM news_items
    GROUP BY source_type
  `;

  const counts = { government: 0, news: 0, x: 0, total: 0 };
  for (const row of countRows) {
    const n = Number(row.count);
    counts.total += n;
    if (row.source_type === "government") counts.government = n;
    if (row.source_type === "news") counts.news = n;
    if (row.source_type === "x") counts.x = n;
  }

  const runs = await sql<{
    finished_at: string | Date | null;
    ok: boolean;
    per_source: unknown;
  }>`
    SELECT finished_at, ok, per_source
    FROM news_sync_runs
    WHERE finished_at IS NOT NULL
    ORDER BY finished_at DESC
    LIMIT 1
  `;

  const last = runs[0];
  return {
    lastSyncedAt: last?.finished_at
      ? new Date(last.finished_at).toISOString()
      : null,
    lastSyncOk: last ? Boolean(last.ok) : null,
    counts,
    perSource: last?.per_source ?? [],
  };
}

export type { NewsCategory };
