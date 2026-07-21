import { cn } from "@/lib/cn";

export type BadgeTone = "default" | "good" | "warn" | "bad" | "accent" | "brass";

const TONE_CLASSES: Record<BadgeTone, string> = {
  default: "border-white/10 text-text-mid bg-ink-2",
  good:    "border-moss/40 text-moss bg-moss/10",
  warn:    "border-[#C89A4C]/40 text-brass-light bg-brass/10",
  bad:     "border-clay/40 text-clay bg-clay/10",
  accent:  "border-cyan/40 text-cyan bg-cyan/10",
  brass:   "border-brass/50 text-brass-light bg-brass/10",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  operational:        "good",
  under_construction: "accent",
  approved:           "accent",
  proposed:           "warn",
  delayed:            "bad",
  cancelled:          "bad",
  completed:          "good",
};

export function statusTone(status: string): BadgeTone {
  return STATUS_TONE[status] ?? "default";
}

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-pill",
        "text-[11px] font-semibold uppercase tracking-wide border",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
