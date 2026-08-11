/**
 * Corporate/managed machines often sit behind an SSL-inspecting proxy that
 * re-signs outbound HTTPS traffic with an internal root CA. macOS trusts that
 * CA system-wide (Keychain), so `curl` and browsers work fine — but Node.js
 * ships its own bundled CA list and never consults the OS keychain, so
 * `fetch()`/`https` calls fail with `unable to get local issuer certificate`.
 *
 * That silently breaks every news source fetch (Google News, NewsAPI,
 * government scrapes) while the sync pipeline still logs "ok" with
 * `inserted: 0`, making the feed look "stuck" with no visible error.
 *
 * This relaxes TLS verification for local development only, matching the
 * workaround already documented in README.md and scripts/news-sync.ts —
 * the difference is it's now applied automatically instead of requiring
 * everyone to remember a manual env var prefix. It is a strict no-op in
 * production and on Vercel, where no such proxy exists and full certificate
 * verification must stay on.
 */
export function relaxTlsForCorporateProxyIfNeeded(): void {
  const isProd = process.env.NODE_ENV === "production";
  const isVercel = Boolean(process.env.VERCEL);
  const alreadySet = process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0";

  if (isProd || isVercel || alreadySet) return;

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn(
    "[tls] NODE_TLS_REJECT_UNAUTHORIZED=0 applied for local dev only " +
      "(corporate SSL proxy workaround — never active in production/Vercel)",
  );
}
