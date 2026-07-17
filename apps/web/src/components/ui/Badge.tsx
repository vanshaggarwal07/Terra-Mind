export type BadgeTone = "default" | "good" | "warn" | "bad" | "accent";

const STATUS_TONE: Record<string, BadgeTone> = {
  operational: "good",
  under_construction: "accent",
  approved: "accent",
  proposed: "warn",
};

export function statusTone(status: string): BadgeTone {
  return STATUS_TONE[status] ?? "default";
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  const cls = tone === "default" ? "badge" : `badge badge--${tone}`;
  return <span className={cls}>{children}</span>;
}
