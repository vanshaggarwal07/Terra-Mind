import type { ActivityPayload } from "@/lib/types";

export async function logActivity(payload: ActivityPayload): Promise<void> {
  try {
    await fetch("/api/sheets-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Non-blocking telemetry — never break UX
  }
}
