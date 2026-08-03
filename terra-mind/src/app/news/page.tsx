import { after } from "next/server";

import { NewsFeed } from "@/components/news/NewsFeed";
import { ensureNewsSchema } from "@/lib/db";
import { getSyncStatus, listNewsItems } from "@/lib/news/queries";
import { maybeTriggerStaleSync } from "@/lib/news/syncGate";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Corridor Signal Feed | Terra-Mind",
  description:
    "Live corridor and ~100 km area news for Noida, Greater Noida, Yamuna Expressway, Jewar Airport, and surrounding districts.",
};

export default async function NewsPage() {
  let items: Awaited<ReturnType<typeof listNewsItems>>["items"] = [];
  let status: Awaited<ReturnType<typeof getSyncStatus>> | null = null;
  let statusUnavailable = false;

  try {
    await ensureNewsSchema();
    // Load accumulated history (all persisted rows up to cap), not only latest 30
    const list = await listNewsItems({ limit: 1000, page: 1 });
    items = list.items;
  } catch (err) {
    console.error("[news/page] feed load failed", err);
  }

  try {
    status = await getSyncStatus();
  } catch {
    statusUnavailable = true;
  }

  // Local / no-Vercel: daily cron never fires. If the archive is stale, refresh
  // in the background after the page is sent (also covers missed Vercel crons).
  const lastSyncedAt = status?.lastSyncedAt ?? null;
  after(() => {
    maybeTriggerStaleSync(lastSyncedAt, "news-page-visit");
  });

  return (
    <section className="overflow-hidden pb-24 pt-6 md:pt-8">
      <NewsFeed
        initialItems={items}
        initialStatus={status}
        statusUnavailable={statusUnavailable}
      />
    </section>
  );
}
