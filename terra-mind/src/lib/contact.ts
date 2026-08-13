import type { PropertyListing } from "@/lib/types";

/**
 * Single source of truth for how buyers reach Terra-Mind.
 *
 * PLACEHOLDER FALLBACKS: the numbers below are placeholders so the UI renders
 * in development. Set the real values in `.env.local` before going live:
 *   NEXT_PUBLIC_WHATSAPP_NUMBER  e.g. 919876543210 (country code, digits only)
 *   NEXT_PUBLIC_CONTACT_PHONE    e.g. +91 98765 43210
 *   NEXT_PUBLIC_CONTACT_EMAIL    e.g. hello@terra-mind.in
 */
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919999999999";
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+91 99999 99999";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@terra-mind.example";

export const CONTACT = {
  whatsappNumber: WHATSAPP_NUMBER,
  phone: CONTACT_PHONE,
  phoneDigits: CONTACT_PHONE.replace(/[^+\d]/g, ""),
  email: CONTACT_EMAIL,
} as const;

export function whatsappUrl(message: string): string {
  return `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function telUrl(): string {
  return `tel:${CONTACT.phoneDigits}`;
}

export function mailtoUrl(subject?: string): string {
  return subject
    ? `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT.email}`;
}

/** Prefilled WhatsApp message carrying the parcel the buyer was looking at. */
export function listingEnquiryMessage(
  listing: Pick<
    PropertyListing,
    "name" | "parcelId" | "pricePerSqYd" | "distanceToAirportKm"
  >,
): string {
  const rate = new Intl.NumberFormat("en-IN").format(listing.pricePerSqYd);
  return (
    `Hi, I'm interested in ${listing.name} (${listing.parcelId}), ` +
    `₹${rate}/sq.yd, ${listing.distanceToAirportKm.toFixed(1)} km from Jewar Airport. ` +
    `Please share details.`
  );
}

export function generalEnquiryMessage(): string {
  return "Hi, I'm exploring plots along the Yamuna Expressway / Jewar Airport corridor on Terra-Mind. Please share what's available.";
}

/** Prefilled WhatsApp message carrying a wealth-calculator result. */
export function projectionMessage(input: {
  parcelId?: string;
  years: number;
  currentValue: string;
  projectedValue: string;
  /** "past" = ledger look-back, "future" (default) = model projection. */
  mode?: "past" | "future";
}): string {
  const subject = input.parcelId ? `on ${input.parcelId}` : "on a corridor parcel";
  if (input.mode === "past") {
    return (
      `Hi, I checked past returns ${subject} on the Terra-Mind wealth calculator: ` +
      `${input.currentValue} invested would be worth ${input.projectedValue} today. Can we discuss?`
    );
  }
  return (
    `Hi, I ran a ${input.years}-year projection ${subject} using the Terra-Mind wealth calculator: ` +
    `${input.currentValue} today to ${input.projectedValue} projected. Can we discuss?`
  );
}
