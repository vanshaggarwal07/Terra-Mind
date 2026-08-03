import { ensureNewsSchema } from "@/lib/db";
import { getSyncStatus } from "@/lib/news/queries";
import {
  maybeTriggerStaleSync,
  syncIntervalMs,
} from "@/lib/news/syncGate";

let started = false;

/**
 * Long-running scheduler for `next dev` / `next start`.
 * On Vercel serverless, prefer vercel.json crons — intervals do not survive cold starts.
 */
export function startNewsSyncScheduler(): void {
  if (started) return;
  if (process.env.NEWS_SYNC_SCHEDULER === "false") {
    console.info("[scheduler] disabled (NEWS_SYNC_SCHEDULER=false)");
    return;
  }
  started = true;

  const intervalMs = syncIntervalMs();
  const intervalMin = Math.round(intervalMs / 60_000);

  const tick = async (reason: string) => {
    try {
      await ensureNewsSchema();
      const status = await getSyncStatus();
      const startedSync = maybeTriggerStaleSync(status.lastSyncedAt, reason);
      if (!startedSync) {
        console.info(
          `[scheduler] up to date (last=${status.lastSyncedAt ?? "never"}, interval=${intervalMin}m)`,
        );
      }
    } catch (err) {
      console.error(
        "[scheduler] tick failed:",
        err instanceof Error ? err.message : err,
      );
    }
  };

  // First check a minute after boot (avoids racing cold PGlite open)
  setTimeout(() => {
    void tick("scheduler-boot");
  }, 60_000);

  setInterval(() => {
    void tick("scheduler-interval");
  }, intervalMs);

  console.info(
    `[scheduler] automatic news sync every ${intervalMin} minutes (~${Math.round(24 * 60 / intervalMin)}×/day)`,
  );
}
