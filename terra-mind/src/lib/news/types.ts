export type NewsSourceType = "government" | "news" | "x";

export type NewsCategory =
  | "jewar-airport"
  | "metro"
  | "yamuna-expressway"
  | "noida"
  | "greater-noida"
  | "jaypee-sports-city"
  | "nearby-100km"
  | "govt-schemes"
  | "builders"
  | "new-launches"
  | "general";

export type NormalizedNewsItem = {
  headline: string;
  body: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: Date | null;
  category: NewsCategory;
  sourceType: NewsSourceType;
};

export type StoredNewsItem = {
  id: string;
  headline: string;
  body: string | null;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  fetchedAt: string;
  category: NewsCategory | string | null;
  sourceType: NewsSourceType;
};

export type SourceFetchResult = {
  sourceKey: string;
  ok: boolean;
  fetched: number;
  inserted: number;
  error?: string;
};

export type SyncRunResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  inserted: number;
  perSource: SourceFetchResult[];
};

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: "jewar-airport", label: "Jewar Airport" },
  { id: "metro", label: "Metro" },
  { id: "yamuna-expressway", label: "Yamuna Expressway" },
  { id: "noida", label: "Noida" },
  { id: "greater-noida", label: "Greater Noida" },
  { id: "jaypee-sports-city", label: "Jaypee Sports City" },
  { id: "nearby-100km", label: "100km Area" },
  { id: "govt-schemes", label: "Govt Schemes" },
  { id: "builders", label: "Builders" },
  { id: "new-launches", label: "New Launches" },
  { id: "general", label: "General" },
];
