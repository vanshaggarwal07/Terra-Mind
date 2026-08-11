export async function register() {
  // Only start the interval scheduler in the Node server runtime
  // (local `next dev` / `next start`). Vercel Cron covers production deploys.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { relaxTlsForCorporateProxyIfNeeded } = await import(
      "./src/lib/devTls"
    );
    relaxTlsForCorporateProxyIfNeeded();

    const { startNewsSyncScheduler } = await import(
      "./src/lib/news/scheduler"
    );
    startNewsSyncScheduler();
  }
}
