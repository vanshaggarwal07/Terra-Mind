import { categorize } from "@/lib/news/categorize";
import { isCorridorRelevant } from "@/lib/news/corridor";
import type { NormalizedNewsItem } from "@/lib/news/types";

/**
 * Separate NewsAPI queries for the corridor + ~100 km ring.
 * Budget: each sync = QUERIES.length requests. Free tier ~100/day —
 * keep NEWS_SYNC_INTERVAL_MINUTES high enough (e.g. 10 queries → ~10 syncs/day).
 */
const QUERIES = [
  '"Jewar Airport" OR "Noida International Airport" OR Jewar',
  '"Yamuna Expressway" OR YEIDA OR "Eastern Peripheral Expressway"',
  'Noida AND (India OR NCR OR "Uttar Pradesh" OR authority OR metro OR sector OR plot OR housing OR "real estate" OR airport)',
  '"Greater Noida" OR GNIDA OR "Knowledge Park" OR "Noida Extension" OR "Greater Noida West"',
  '"Jaypee Sports City" OR "Jaypee Greens" OR "Wish Town" OR "Jaypee Infratech"',
  '"Noida metro" OR "Aqua Line" OR RRTS OR "Delhi Meerut" OR NMRC',
  'Dadri OR Tappal OR Dankaur OR Surajpur OR Ecotech OR Kasna OR "Pari Chowk" OR "Gautam Buddh Nagar" OR "Gautam Buddha Nagar"',
  'Bulandshahr OR Bulandshahar OR Khurja OR Sikandrabad OR Sikandarabad',
  'Ghaziabad AND (Noida OR metro OR RRTS OR expressway OR industrial OR housing OR plot OR sector)',
  'Faridabad AND (Noida OR "Yamuna Expressway" OR Jewar OR expressway OR industrial OR housing)',
] as const;

type NewsApiArticle = {
  title?: string | null;
  description?: string | null;
  content?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  source?: { name?: string | null } | null;
};

type NewsApiResponse = {
  status?: string;
  totalResults?: number;
  articles?: NewsApiArticle[];
  message?: string;
  code?: string;
};

function getApiKey(): string | undefined {
  return process.env.NEWSAPI_KEY?.trim() || undefined;
}

function mapArticle(article: NewsApiArticle): NormalizedNewsItem | null {
  const headline = article.title?.trim();
  const sourceUrl = article.url?.trim();
  if (!headline || !sourceUrl) return null;
  if (headline === "[Removed]") return null;

  const body = (article.description || article.content || "")
    .replace(/\[\+\d+\s+chars\]$/i, "")
    .trim();

  // Drop off-area noise (e.g. unrelated "Noida" hits abroad)
  if (!isCorridorRelevant(headline, body)) return null;

  const publishedAt = article.publishedAt
    ? new Date(article.publishedAt)
    : null;

  return {
    headline,
    body,
    sourceName: article.source?.name?.trim() || "NewsAPI",
    sourceUrl,
    publishedAt:
      publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    category: categorize(headline, body),
    sourceType: "news",
  };
}

async function fetchQuery(
  query: string,
  apiKey: string,
): Promise<NormalizedNewsItem[]> {
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "50");

  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": apiKey },
    next: { revalidate: 0 },
  });

  const data = (await res.json()) as NewsApiResponse;
  if (!res.ok || data.status === "error") {
    throw new Error(
      data.message || `NewsAPI HTTP ${res.status} for query: ${query}`,
    );
  }

  const articles = data.articles ?? [];
  return articles
    .map(mapArticle)
    .filter((item): item is NormalizedNewsItem => item !== null);
}

/**
 * Fetches corridor + 100 km ring news via NewsAPI.org as SEPARATE queries,
 * then merges/dedupes by URL.
 */
export async function fetchNewsApiItems(): Promise<NormalizedNewsItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(
      "[newsApi] NEWSAPI_KEY missing — skipping general news source",
    );
    return [];
  }

  const byUrl = new Map<string, NormalizedNewsItem>();
  const errors: string[] = [];

  for (const query of QUERIES) {
    try {
      const items = await fetchQuery(query, apiKey);
      console.info(
        `[newsApi] query ok (${items.length} items): ${query.slice(0, 70)}`,
      );
      for (const item of items) {
        if (!byUrl.has(item.sourceUrl)) byUrl.set(item.sourceUrl, item);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[newsApi] query failed: ${query} — ${msg}`);
      errors.push(msg);
    }
  }

  if (byUrl.size === 0 && errors.length > 0) {
    throw new Error(`NewsAPI: all queries failed. ${errors[0]}`);
  }

  const merged = [...byUrl.values()];
  console.info(
    `[newsApi] merged ${merged.length} unique corridor items from ${QUERIES.length} queries`,
  );
  return merged;
}
