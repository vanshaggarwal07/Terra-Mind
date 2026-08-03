/**
 * Phase 1 smoke test: ensure schema, insert one row, read it back.
 * Usage: npx tsx scripts/news-db-smoke.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { dbBackend, ensureNewsSchema, sql } from "../src/lib/db";

async function main() {
  console.info(`[smoke] backend=${dbBackend()}`);
  await ensureNewsSchema();

  const url = `https://terra-mind.local/smoke/${Date.now()}`;
  await sql`
    INSERT INTO news_items (
      headline, body, source_name, source_url, published_at, category, source_type
    ) VALUES (
      ${"Smoke test: Jewar Airport corridor signal"},
      ${"Phase 1 verification row — safe to delete."},
      ${"Terra-Mind Smoke"},
      ${url},
      ${new Date().toISOString()},
      ${"jewar-airport"},
      ${"news"}
    )
  `;

  const rows = await sql<{
    id: string;
    headline: string;
    source_url: string;
    category: string;
  }>`
    SELECT id, headline, source_url, category
    FROM news_items
    WHERE source_url = ${url}
    LIMIT 1
  `;

  if (rows.length !== 1) {
    throw new Error("Smoke test failed: inserted row not found");
  }

  console.info("[smoke] OK — inserted and read back:");
  console.info(rows[0]);

  await sql`DELETE FROM news_items WHERE source_url = ${url}`;
  console.info("[smoke] cleaned up test row");
}

main().catch((err) => {
  console.error("[smoke] FAILED", err);
  process.exit(1);
});
