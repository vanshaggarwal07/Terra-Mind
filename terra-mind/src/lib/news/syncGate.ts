import { runNewsSyncSafe } from "@/lib/news/aggregator";

let syncInFlight: Promise<unknown> | null = null;

/** Default: 6 hours → 4 automatic syncs per day. */
export function syncIntervalMs(): number {
  const minutes = Number(process.env.NEWS_SYNC_INTERVAL_MINUTES);
  if (Number.isFinite(minutes) && minutes > 0) return minutes * 60_000;
  return 6 * 60 * 60_000;
}

export function isSyncStale(lastSyncedAt: string | null | undefined): boolean {
  if (!lastSyncedAt) return true;
  const then = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(then)) return true;
  return Date.now() - then >= syncIntervalMs();
}

/**
 * Starts a background sync if none is running. Safe to call from page `after()`.
 * Does not throw to the caller.
 */
export function triggerNewsSyncIfIdle(reason: string): void {
  if (syncInFlight) {
    console.info(`[syncGate] skip (${reason}): sync already in flight`);
    return;
  }
  console.info(`[syncGate] starting sync (${reason})`);
  syncInFlight = runNewsSyncSafe()
    .then((result) => {
      console.info(
        `[syncGate] finished ok=${result.ok} inserted=${result.inserted}`,
      );
      return result;
    })
    .catch((err) => {
      console.error(
        "[syncGate] sync failed:",
        err instanceof Error ? err.message : err,
      );
    })
    .finally(() => {
      syncInFlight = null;
    });
}

export function maybeTriggerStaleSync(
  lastSyncedAt: string | null | undefined,
  reason = "stale",
): boolean {
  if (!isSyncStale(lastSyncedAt)) return false;
  triggerNewsSyncIfIdle(reason);
  return true;
}
