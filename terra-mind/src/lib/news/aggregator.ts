import { ensureNewsSchema, sql } from "@/lib/db";
import { insertIfNew } from "@/lib/news/dedupe";
import type {
  NormalizedNewsItem,
  SourceFetchResult,
  SyncRunResult,
} from "@/lib/news/types";
import { fetchGoogleNewsItems } from "@/lib/sources/googleNews";
import { fetchGovernmentItems } from "@/lib/sources/government";
import { fetchNewsApiItems } from "@/lib/sources/newsApi";
import { fetchXCuratedItems } from "@/lib/sources/xCurated";

async function persistBatch(
  sourceKey: string,
  items: NormalizedNewsItem[],
): Promise<SourceFetchResult> {
  let inserted = 0;
  for (const item of items) {
    try {
      const result = await insertIfNew(item);
      if (result === "inserted") inserted += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[aggregator] insert failed for ${sourceKey}: ${msg}`);
    }
  }
  if (inserted > 0) {
    console.info(
      `[aggregator] ${sourceKey}: fetched ${items.length}, inserted ${inserted}`,
    );
  } else {
    console.info(
      `[aggregator] ${sourceKey}: fetched ${items.length}, inserted 0 (all duplicates or empty)`,
    );
  }
  return {
    sourceKey,
    ok: true,
    fetched: items.length,
    inserted,
  };
}

export async function runNewsSync(): Promise<SyncRunResult> {
  await ensureNewsSchema();
  const startedAt = new Date();
  const perSource: SourceFetchResult[] = [];
  let insertedTotal = 0;

  // --- Google News place tiles (~100 km ring, free RSS) ---
  try {
    const googleItems = await fetchGoogleNewsItems();
    const result = await persistBatch("google-news", googleItems);
    perSource.push(result);
    insertedTotal += result.inserted;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[aggregator] google-news failed (continuing): ${msg}`);
    perSource.push({
      sourceKey: "google-news",
      ok: false,
      fetched: 0,
      inserted: 0,
      error: msg,
    });
  }

  // --- NewsAPI (isolated) ---
  try {
    const newsItems = await fetchNewsApiItems();
    const result = await persistBatch("newsapi", newsItems);
    perSource.push(result);
    insertedTotal += result.inserted;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[aggregator] newsapi failed (continuing): ${msg}`);
    perSource.push({
      sourceKey: "newsapi",
      ok: false,
      fetched: 0,
      inserted: 0,
      error: msg,
    });
  }

  // --- Government sources (already internally isolated) ---
  try {
    const { items, results } = await fetchGovernmentItems();
    // Persist once for merged gov items, but report per-source fetch counts
    const persist = await persistBatch("government", items);
    insertedTotal += persist.inserted;

    for (const r of results) {
      perSource.push({
        sourceKey: r.sourceKey,
        ok: !r.error,
        fetched: r.items.length,
        inserted: 0, // insert accounting is on merged batch
        error: r.error,
      });
    }
    // Attach merged insert count on a summary key
    perSource.push({
      sourceKey: "government-merged",
      ok: true,
      fetched: items.length,
      inserted: persist.inserted,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[aggregator] government failed (continuing): ${msg}`);
    perSource.push({
      sourceKey: "government",
      ok: false,
      fetched: 0,
      inserted: 0,
      error: msg,
    });
  }

  // --- X curated (never throws) ---
  try {
    const xItems = await fetchXCuratedItems();
    const result = await persistBatch("x", xItems);
    perSource.push(result);
    insertedTotal += result.inserted;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[aggregator] x failed (continuing): ${msg}`);
    perSource.push({
      sourceKey: "x",
      ok: false,
      fetched: 0,
      inserted: 0,
      error: msg,
    });
  }

  const finishedAt = new Date();
  const anyOk = perSource.some((s) => s.ok);
  const perSourceJson = JSON.stringify(perSource);

  try {
    await sql`
      INSERT INTO news_sync_runs (started_at, finished_at, ok, per_source)
      VALUES (
        ${startedAt.toISOString()},
        ${finishedAt.toISOString()},
        ${anyOk},
        ${perSourceJson}
      )
    `;
  } catch (err) {
    console.warn(
      "[aggregator] sync_runs insert warning:",
      err instanceof Error ? err.message : err,
    );
  }

  return {
    ok: anyOk,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    inserted: insertedTotal,
    perSource,
  };
}

/** Safe wrapper that never throws to the caller — logs and returns failure shape. */
export async function runNewsSyncSafe(): Promise<SyncRunResult> {
  try {
    return await runNewsSync();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[aggregator] sync aborted: ${msg}`);
    const now = new Date().toISOString();
    try {
      await sql`
        INSERT INTO news_sync_runs (started_at, finished_at, ok, per_source)
        VALUES (
          ${now},
          ${now},
          ${false},
          ${JSON.stringify([{ sourceKey: "pipeline", ok: false, fetched: 0, inserted: 0, error: msg }])}
        )
      `;
    } catch {
      // ignore meta write failure
    }
    return {
      ok: false,
      startedAt: now,
      finishedAt: now,
      inserted: 0,
      perSource: [
        {
          sourceKey: "pipeline",
          ok: false,
          fetched: 0,
          inserted: 0,
          error: msg,
        },
      ],
    };
  }
}
