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
}

export interface ListingFilters {
  location: string;
  priceMin: number;
  priceMax: number;
  airportMaxKm: number;
  phase: ExpresswayPhase | "all";
}

export type ActivityAction =
  | "page_view"
  | "listing_view"
  | "filter_change"
  | "calculator_use"
  | "enquire_submit"
  | "cta_click";

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
