/**
 * Manual sync trigger for local verification.
 * Usage: npx tsx scripts/news-sync.ts
 *
 * Corporate SSL proxies: NODE_TLS_REJECT_UNAUTHORIZED=0 npm run news:sync
 * (do NOT set that on Vercel / production)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { dbBackend } from "../src/lib/db";
import { runNewsSync } from "../src/lib/news/aggregator";

async function main() {
  console.info(`[sync] backend=${dbBackend()}`);
  const result = await runNewsSync();
  console.info("[sync] done", JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[sync] FAILED", err);
  process.exit(1);
});
