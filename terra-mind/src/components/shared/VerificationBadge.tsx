import { SealCheck } from "@phosphor-icons/react/dist/ssr";

import type { PropertyListing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  listing: PropertyListing;
  /** pill: one-line badge. block: full panel with notes. */
  variant?: "pill" | "block";
  className?: string;
}

/**
 * Renders ONLY when verification data exists on the listing, and states
 * exactly what was checked. No generic "100% safe" claims — if the fields
 * are empty, nothing renders.
 */
export function VerificationBadge({
  listing,
  variant = "block",
  className,
}: VerificationBadgeProps) {
  const hasVerification = listing.titleVerified === true || !!listing.reraId;
  if (!hasVerification) return null;

  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-growth/30 bg-growth-tint px-2.5 py-1 font-data text-[11px] text-growth",
          className,
        )}
      >
        <SealCheck weight="fill" className="size-3.5" aria-hidden />
        {listing.titleVerified ? "Title checked" : "RERA registered"}
        {listing.verifiedOn && (
          <span className="text-growth/70">· {listing.verifiedOn}</span>
        )}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-growth/30 bg-growth-tint p-4",
        className,
      )}
    >
      <p className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.18em] text-growth">
        <SealCheck weight="fill" className="size-4" aria-hidden />
        Verification on file
      </p>
      <ul className="mt-2.5 space-y-1.5 text-sm text-foreground">
        {listing.titleVerified && (
          <li>
            Title chain checked
            {listing.verifiedOn && (
              <span className="text-dim"> · {listing.verifiedOn}</span>
            )}
          </li>
        )}
        {listing.reraId && (
          <li>
            RERA registration{" "}
            <span className="font-data text-dim">{listing.reraId}</span>
          </li>
        )}
      </ul>
      {listing.verificationNotes && (
        <p className="mt-2 text-xs leading-relaxed text-dim">
          {listing.verificationNotes}
        </p>
      )}
    </div>
  );
}
