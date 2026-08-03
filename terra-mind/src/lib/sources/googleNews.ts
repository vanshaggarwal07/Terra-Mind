import Parser from "rss-parser";

import { categorize } from "@/lib/news/categorize";
import { isCorridorRelevant } from "@/lib/news/corridor";
import type { NormalizedNewsItem } from "@/lib/news/types";

/**
 * First-class Google News RSS intake for the ~100 km corridor ring.
 * Free, no API key. Complements NewsAPI with broader place / topic tiles.
 */
const PLACE_QUERIES = [
  // Core
  '"Jewar Airport" OR "Noida International Airport" OR Jewar',
  '"Yamuna Expressway" OR YEIDA',
  'Noida (authority OR metro OR sector OR plot OR housing OR "real estate" OR scheme OR industrial)',
  '"Greater Noida" OR GNIDA OR "Knowledge Park" OR "Noida Extension" OR "Greater Noida West"',
  '"Jaypee Sports City" OR "Jaypee Greens" OR "Wish Town" OR "Jaypee Infratech"',
  '"Noida Metro" OR "Aqua Line" OR NMRC OR "RRTS Noida" OR "Delhi Meerut RRTS"',
  // 100 km ring
  'Dadri OR Tappal OR Dankaur OR Surajpur OR Ecotech OR Kasna OR "Pari Chowk"',
  '"Gautam Buddh Nagar" OR "Gautam Buddha Nagar" OR "GB Nagar"',
  'Bulandshahr OR Bulandshahar OR Khurja OR Sikandrabad OR Sikandarabad',
  'Ghaziabad (Noida OR metro OR RRTS OR expressway OR industrial OR housing OR plot OR sector)',
  'Faridabad (Noida OR "Yamuna Expressway" OR Jewar OR expressway OR industrial OR housing)',
  '"Eastern Peripheral Expressway" OR "EPE" (Noida OR Ghaziabad OR Faridabad OR Jewar)',
  'Hapur OR Modinagar OR Muradnagar OR Dasna (Noida OR Ghaziabad OR expressway OR industrial)',
  'Palwal OR Ballabhgarh (expressway OR industrial OR "Yamuna" OR Jewar OR Noida)',
  // Broader web / realty / infra catch-all for the district
  '("real estate" OR housing OR plot OR township OR infra OR highway OR airport OR metro) (Noida OR "Greater Noida" OR YEIDA OR Jewar OR Dadri)',
] as const;

const rssParser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; TerraMindCorridorBot/1.0; +https://terra-mind.local)",
    Accept: "application/rss+xml, application/xml, text/xml,*/*",
  },
});

function googleNewsRssUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function toItem(entry: {
  title?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
}): NormalizedNewsItem | null {
  const headline = entry.title?.trim() ?? "";
  const body = (entry.contentSnippet || entry.content || entry.summary || "")
    .toString()
    .trim();
  const sourceUrl = (entry.link || entry.guid || "").toString().trim();
  if (!headline || !sourceUrl) return null;
  if (!/^https?:\/\//i.test(sourceUrl)) return null;
  if (!isCorridorRelevant(headline, body)) return null;

  const publishedAt = entry.isoDate
    ? new Date(entry.isoDate)
    : entry.pubDate
      ? new Date(entry.pubDate)
      : null;

  return {
    headline,
    body,
    sourceName: "Google News",
    sourceUrl,
    publishedAt:
      publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    category: categorize(headline, body),
    sourceType: "news",
  };
}

async function fetchQuery(query: string): Promise<NormalizedNewsItem[]> {
  const feed = await rssParser.parseURL(googleNewsRssUrl(query));
  const items: NormalizedNewsItem[] = [];
  for (const entry of (feed.items ?? []).slice(0, 25)) {
    const item = toItem(entry);
    if (item) items.push(item);
  }
  return items;
}

/** Run place-tiled Google News RSS queries; merge by URL. */
export async function fetchGoogleNewsItems(): Promise<NormalizedNewsItem[]> {
  const byUrl = new Map<string, NormalizedNewsItem>();
  const errors: string[] = [];

  // Modest concurrency so we don't stampede Google News
  const concurrency = 4;
  for (let i = 0; i < PLACE_QUERIES.length; i += concurrency) {
    const batch = PLACE_QUERIES.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (query) => {
        try {
          const items = await fetchQuery(query);
          console.info(
            `[googleNews] ok (${items.length}): ${query.slice(0, 72)}`,
          );
          return items;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[googleNews] failed: ${query} — ${msg}`);
          errors.push(msg);
          return [] as NormalizedNewsItem[];
        }
      }),
    );
    for (const items of results) {
      for (const item of items) {
        if (!byUrl.has(item.sourceUrl)) byUrl.set(item.sourceUrl, item);
      }
    }
  }

  const merged = [...byUrl.values()];
  console.info(
    `[googleNews] merged ${merged.length} unique items from ${PLACE_QUERIES.length} place tiles` +
      (errors.length ? ` (${errors.length} tile errors)` : ""),
  );
  return merged;
}
