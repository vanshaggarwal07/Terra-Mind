import * as cheerio from "cheerio";
import Parser from "rss-parser";

import { categorize } from "@/lib/news/categorize";
import { isCorridorRelevant } from "@/lib/news/corridor";
import type { NormalizedNewsItem } from "@/lib/news/types";

const rssParser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; TerraMindCorridorBot/1.0; +https://terra-mind.local)",
    Accept: "application/rss+xml, application/xml, text/xml, text/html,*/*",
  },
});

function matchesCorridor(text: string): boolean {
  return isCorridorRelevant(text, "");
}

function toItem(input: {
  headline: string;
  body: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: Date | null;
}): NormalizedNewsItem | null {
  const headline = input.headline.trim();
  const sourceUrl = input.sourceUrl.trim();
  if (!headline || !sourceUrl) return null;
  if (!/^https?:\/\//i.test(sourceUrl)) return null;
  return {
    headline,
    body: input.body.trim(),
    sourceName: input.sourceName,
    sourceUrl,
    publishedAt: input.publishedAt,
    category: categorize(headline, input.body),
    sourceType: "government",
  };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function tryRss(
  feedUrl: string,
  sourceName: string,
  opts?: { filter?: boolean; limit?: number },
): Promise<NormalizedNewsItem[]> {
  const feed = await rssParser.parseURL(feedUrl);
  const limit = opts?.limit ?? 25;
  const items: NormalizedNewsItem[] = [];
  for (const entry of (feed.items ?? []).slice(0, limit)) {
    const headline = entry.title?.trim() ?? "";
    const body = (entry.contentSnippet || entry.content || entry.summary || "")
      .toString()
      .trim();
    const sourceUrl = (entry.link || entry.guid || "").toString().trim();
    const publishedAt = entry.isoDate
      ? new Date(entry.isoDate)
      : entry.pubDate
        ? new Date(entry.pubDate)
        : null;
    if (opts?.filter && !matchesCorridor(`${headline}\n${body}`)) continue;
    const item = toItem({
      headline,
      body,
      sourceName,
      sourceUrl,
      publishedAt:
        publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    });
    if (item) items.push(item);
  }
  return items;
}

/**
 * When official authority sites block bots (Cloudflare 403), use Google News RSS
 * scoped to the authority domain / keywords. Items remain government-tagged.
 */
async function googleNewsGovFallback(
  query: string,
  sourceName: string,
): Promise<NormalizedNewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  // Always corridor-filter — Google News queries can still drift off-topic
  const items = await tryRss(url, `${sourceName} (via Google News)`, {
    filter: true,
    limit: 25,
  });
  console.info(
    `[government] Google News fallback for ${sourceName}: ${items.length} corridor-matched items (query: ${query})`,
  );
  return items;
}

async function scrapeLinks(
  pageUrl: string,
  sourceName: string,
  selectors: string[],
  opts?: { filter?: boolean },
): Promise<NormalizedNewsItem[]> {
  const html = await fetchText(pageUrl);
  const $ = cheerio.load(html);
  const items: NormalizedNewsItem[] = [];
  const seen = new Set<string>();

  for (const selector of selectors) {
    try {
      $(selector).each((_, el) => {
        try {
          const anchor = $(el).is("a") ? $(el) : $(el).find("a").first();
          const headline = (anchor.text() || $(el).text())
            .replace(/\s+/g, " ")
            .trim();
          let href = anchor.attr("href")?.trim() ?? "";
          if (!headline || headline.length < 12) return;
          if (!href) return;
          if (href.startsWith("/")) {
            const base = new URL(pageUrl);
            href = `${base.origin}${href}`;
          } else if (href.startsWith("./") || !href.includes("://")) {
            href = new URL(href, pageUrl).toString();
          }
          if (seen.has(href)) return;
          if (opts?.filter && !matchesCorridor(headline)) return;
          const item = toItem({
            headline,
            body: headline,
            sourceName,
            sourceUrl: href,
            publishedAt: null,
          });
          if (item) {
            seen.add(href);
            items.push(item);
          }
        } catch {
          // continue
        }
      });
    } catch {
      console.warn(
        `[government] selector failed on ${pageUrl}: ${selector}`,
      );
    }
  }

  if (items.length === 0) {
    console.warn(
      `[government] HTML structure differed from expected on ${pageUrl} — 0 items from selectors`,
    );
  }
  return items.slice(0, 30);
}

async function scrapePibReleases(): Promise<NormalizedNewsItem[]> {
  const html = await fetchText("https://www.pib.gov.in/Allrel.aspx");
  const $ = cheerio.load(html);
  const items: NormalizedNewsItem[] = [];
  const seen = new Set<string>();

  $("a").each((_, el) => {
    try {
      const headline = $(el).text().replace(/\s+/g, " ").trim();
      let href = $(el).attr("href")?.trim() ?? "";
      if (!headline || headline.length < 20) return;
      if (!matchesCorridor(headline)) return;
      if (!href) return;
      if (href.startsWith("/")) href = `https://www.pib.gov.in${href}`;
      if (!href.includes("pib.gov.in")) return;
      if (seen.has(href)) return;
      const item = toItem({
        headline,
        body: headline,
        sourceName: "PIB India",
        sourceUrl: href,
        publishedAt: null,
      });
      if (item) {
        seen.add(href);
        items.push(item);
      }
    } catch {
      // continue
    }
  });

  if (items.length === 0) {
    console.warn(
      "[government:pib] Allrel.aspx parsed but no corridor-matching links found",
    );
  }
  return items.slice(0, 25);
}

type GovFetcher = () => Promise<NormalizedNewsItem[]>;

async function fetchYeida(): Promise<NormalizedNewsItem[]> {
  // Official site is Cloudflare-protected (often 403 to bots). Try scrape, then fallback.
  try {
    const items = await scrapeLinks(
      "https://www.yamunaexpresswayauthority.com/web/announcement/",
      "YEIDA",
      ["table tr td a", ".announcement a", "li a"],
    );
    if (items.length > 0) return items;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[government:yeida] no RSS; HTML scrape blocked/failed (${msg}). Falling back to Google News site/keyword query.`,
    );
  }
  return googleNewsGovFallback(
    'YEIDA OR "Yamuna Expressway Authority" OR "yamunaexpresswayauthority.com"',
    "YEIDA",
  );
}

async function fetchNoidaAuthority(): Promise<NormalizedNewsItem[]> {
  for (const page of [
    "https://www.noidaauthorityonline.in/",
    "https://noidaauthorityonline.com/",
  ]) {
    try {
      const items = await scrapeLinks(
        page,
        "Noida Authority",
        [".news a", ".notice a", "table a", "li a"],
        { filter: true },
      );
      if (items.length > 0) return items;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[government:noida] ${page}: ${msg}`);
    }
  }
  console.warn(
    "[government:noida] scrape unavailable — Google News fallback",
  );
  return googleNewsGovFallback(
    '("Noida Authority" OR site:noidaauthorityonline.in) (scheme OR plot OR sector OR metro OR housing OR authority OR notice OR tender)',
    "Noida Authority",
  );
}

async function fetchGreaterNoida(): Promise<NormalizedNewsItem[]> {
  try {
    const items = await scrapeLinks(
      "https://www.greaternoidaauthority.in/",
      "Greater Noida Authority",
      [".news a", ".notice a", "table a", "li a"],
      { filter: true },
    );
    if (items.length > 0) return items;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[government:gnida] scrape failed: ${msg}`);
  }
  return googleNewsGovFallback(
    '("Greater Noida" OR GNIDA OR "Knowledge Park" OR "Noida Extension") (authority OR scheme OR plot OR YEIDA OR airport OR housing OR tender OR notice)',
    "Greater Noida Authority",
  );
}

async function fetchPibCivilAviation(): Promise<NormalizedNewsItem[]> {
  try {
    const items = await scrapePibReleases();
    if (items.length > 0) {
      console.info(`[government:pib] Allrel scrape: ${items.length} items`);
      return items;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[government:pib] Allrel scrape failed: ${msg}`);
  }
  return googleNewsGovFallback(
    'site:pib.gov.in (Jewar OR Noida OR "Greater Noida" OR "Yamuna Expressway" OR YEIDA OR Ghaziabad OR Bulandshahr OR "Gautam Buddh Nagar")',
    "PIB India",
  );
}

async function fetchNhai(): Promise<NormalizedNewsItem[]> {
  try {
    const items = await scrapeLinks(
      "https://nhai.gov.in/",
      "NHAI",
      [".view-content a", "table a", "a"],
      { filter: true },
    );
    if (items.length > 0) return items;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[government:nhai] scrape failed: ${msg}`);
  }
  return googleNewsGovFallback(
    'NHAI ("Yamuna Expressway" OR Jewar OR Noida OR "Eastern Peripheral" OR EPE OR Ghaziabad OR Faridabad OR Dadri)',
    "NHAI",
  );
}

async function fetchUpPib(): Promise<NormalizedNewsItem[]> {
  for (const feed of [
    "https://information.up.gov.in/en/rss.xml",
    "https://up.gov.in/rss.xml",
  ]) {
    try {
      const items = await tryRss(feed, "UP Information", {
        filter: true,
        limit: 40,
      });
      if (items.length > 0) return items;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[government:up] RSS failed ${feed}: ${msg}`);
    }
  }
  return googleNewsGovFallback(
    '(YEIDA OR Jewar OR "Yamuna Expressway" OR "Noida International Airport" OR "Greater Noida" OR "Jaypee Sports City" OR Dadri OR Bulandshahr OR Khurja OR "Gautam Buddh Nagar") ("Uttar Pradesh" OR UP OR Noida)',
    "UP Information",
  );
}

async function fetchJaypeeCorridor(): Promise<NormalizedNewsItem[]> {
  return googleNewsGovFallback(
    '"Jaypee Sports City" OR "Jaypee Greens" OR "Wish Town" OR "Jaypee Infratech" OR "Sports City" (Noida OR "Greater Noida")',
    "Jaypee Sports City",
  );
}

async function fetchNearbyDistrictGov(): Promise<NormalizedNewsItem[]> {
  return googleNewsGovFallback(
    '(Dadri OR Tappal OR Dankaur OR Bulandshahr OR Khurja OR Sikandrabad OR "Gautam Buddh Nagar" OR Ghaziabad OR Faridabad) (authority OR scheme OR plot OR industrial OR housing OR notice OR tender OR expressway OR airport OR metro)',
    "District & NCR-east gov",
  );
}

function dedupeByUrl(items: NormalizedNewsItem[]): NormalizedNewsItem[] {
  const map = new Map<string, NormalizedNewsItem>();
  for (const item of items) {
    if (!map.has(item.sourceUrl)) map.set(item.sourceUrl, item);
  }
  return [...map.values()];
}

const FETCHERS: { key: string; run: GovFetcher }[] = [
  { key: "yeida", run: fetchYeida },
  { key: "noida-authority", run: fetchNoidaAuthority },
  { key: "greater-noida", run: fetchGreaterNoida },
  { key: "jaypee-sports-city", run: fetchJaypeeCorridor },
  { key: "nearby-district-gov", run: fetchNearbyDistrictGov },
  { key: "pib", run: fetchPibCivilAviation },
  { key: "nhai", run: fetchNhai },
  { key: "up-pib", run: fetchUpPib },
];

export type GovernmentSourceResult = {
  sourceKey: string;
  items: NormalizedNewsItem[];
  error?: string;
};

export async function fetchGovernmentItems(): Promise<{
  items: NormalizedNewsItem[];
  results: GovernmentSourceResult[];
}> {
  const results = await Promise.all(
    FETCHERS.map(async ({ key, run }) => {
      try {
        const items = await run();
        if (items.length === 0) {
          console.info(
            `[government:${key}] fetch succeeded with 0 new candidate items`,
          );
        } else {
          console.info(
            `[government:${key}] fetch succeeded with ${items.length} candidate items`,
          );
        }
        return { sourceKey: key, items };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[government:${key}] fetch failed: ${msg}`);
        return {
          sourceKey: key,
          items: [] as NormalizedNewsItem[],
          error: msg,
        };
      }
    }),
  );

  return { items: dedupeByUrl(results.flatMap((r) => r.items)), results };
}
