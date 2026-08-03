import { sql } from "@/lib/db";
import type { NormalizedNewsItem } from "./types";

function normalizeHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple normalized edit-distance ratio (0 = identical, 1 = totally different). */
export function headlineDistance(a: string, b: string): number {
  const left = normalizeHeadline(a);
  const right = normalizeHeadline(b);
  if (left === right) return 0;
  if (!left.length || !right.length) return 1;

  // Fast reject on length skew
  const maxLen = Math.max(left.length, right.length);
  const minLen = Math.min(left.length, right.length);
  if (maxLen - minLen > maxLen * 0.25) return 1;

  const m = left.length;
  const n = right.length;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n] / maxLen;
}

const FUZZY_THRESHOLD = 0.12;

export async function isDuplicate(item: NormalizedNewsItem): Promise<boolean> {
  const byUrl = await sql<{ id: string }>`
    SELECT id FROM news_items WHERE source_url = ${item.sourceUrl} LIMIT 1
  `;
  if (byUrl.length > 0) return true;

  const target = normalizeHeadline(item.headline);
  if (!target) return false;

  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await sql<{ headline: string }>`
    SELECT headline FROM news_items
    WHERE published_at IS NULL OR published_at >= ${windowStart}
    ORDER BY fetched_at DESC
    LIMIT 80
  `;

  for (const row of recent) {
    const other = normalizeHeadline(row.headline);
    if (other === target) return true;
    if (headlineDistance(item.headline, row.headline) <= FUZZY_THRESHOLD) {
      return true;
    }
  }
  return false;
}

export async function insertIfNew(
  item: NormalizedNewsItem,
): Promise<"inserted" | "duplicate"> {
  if (await isDuplicate(item)) return "duplicate";

  try {
    await sql`
      INSERT INTO news_items (
        headline, body, source_name, source_url, published_at, category, source_type
      ) VALUES (
        ${item.headline},
        ${item.body},
        ${item.sourceName},
        ${item.sourceUrl},
        ${item.publishedAt ? item.publishedAt.toISOString() : null},
        ${item.category},
        ${item.sourceType}
      )
    `;
    return "inserted";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("unique") || msg.includes("duplicate")) {
      return "duplicate";
    }
    throw err;
  }
}
