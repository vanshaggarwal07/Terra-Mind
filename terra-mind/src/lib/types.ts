export type ExpresswayPhase = "I" | "II" | "III" | "IV";

export type PropertyFeatureKey =
  | "valuation"
  | "infra"
  | "transactions"
  | "enquire";

export interface PropertyListing {
  id: string;
  parcelId: string;
  name: string;
  location: string;
  locality: string;
  region: string;
  pricePerSqYd: number;
  areaSqYd: number;
  distanceToAirportKm: number;
  expresswayPhase: ExpresswayPhase;
  growthPct: number;
  confidencePct: number;
  lat: number;
  lng: number;
  valuationNote: string;
  infraTimeline: { year: number; event: string; source: string }[];
  transactions: { date: string; rate: number; type: string }[];
  imageHint: string;
  /** Straight-line distance to the planned YEIDA Film City site (Sector 21). */
  distanceToFilmCityKm?: number;
  /** Measured drive time. When absent the UI shows a labelled estimate. */
  driveMinutesToAirport?: number;
  driveMinutesToFilmCity?: number;
  /** Verification signals — rendered only when present, never fabricated. */
  reraId?: string;
  titleVerified?: boolean;
  verifiedOn?: string;
  verificationNotes?: string;
  images?: { src: string; alt: string }[];
}

export interface ListingFilters {
  location: string;
  priceMin: number;
  priceMax: number;
  airportMaxKm: number;
  /** Max distance to the planned Film City site. At the slider max the filter is off. */
  filmCityMaxKm: number;
  phase: ExpresswayPhase | "all";
}

export type ActivityAction =
  | "page_view"
  | "listing_view"
  | "filter_change"
  | "calculator_use"
  | "enquire_submit"
  | "cta_click"
  | "whatsapp_click"
  | "call_click"
  | "lead_capture";

export interface ActivityPayload {
  action: ActivityAction;
  propertyId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface ValuationInputs {
  distanceKm: number;
  phase: ExpresswayPhase;
  years: number;
  baseRate: number;
}
