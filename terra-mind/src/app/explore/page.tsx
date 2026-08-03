import { BrowseStream } from "@/components/browse/BrowseStream";
import { fetchListingsFromSheet } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { listings, source } = await fetchListingsFromSheet();
  return <BrowseStream listings={listings} source={source} />;
}
