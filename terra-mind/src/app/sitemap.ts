import type { MetadataRoute } from "next";

import { getListings } from "@/lib/sheets";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { listings } = await getListings();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/calculator`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/news`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/enquire`, changeFrequency: "monthly", priority: 0.8 },
  ];

  const listingRoutes: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${SITE_URL}/property/${listing.id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...listingRoutes];
}
