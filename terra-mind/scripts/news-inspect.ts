import { config } from "dotenv";
config({ path: ".env.local" });

import { ensureNewsSchema, sql } from "../src/lib/db";

async function main() {
  await ensureNewsSchema();
  const counts = await sql<{
    source_type: string;
    category: string;
    n: number;
  }>`
    SELECT source_type, category, COUNT(*)::int AS n
    FROM news_items
    GROUP BY source_type, category
    ORDER BY source_type, n DESC
  `;
  console.log("by type/category", counts);
  const total = await sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM news_items`;
  console.log("total", total);
  const sample = await sql<{
    headline: string;
    category: string;
    source_type: string;
    source_name: string;
  }>`
    SELECT headline, category, source_type, source_name
    FROM news_items
    ORDER BY fetched_at DESC
    LIMIT 12
  `;
  console.log("sample", sample);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
