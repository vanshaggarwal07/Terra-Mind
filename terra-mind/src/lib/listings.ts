import type { ListingFilters, PropertyListing } from "@/lib/types";

export const DUMMY_LISTINGS: PropertyListing[] = [
  {
    id: "tm-ye-22d-014",
    parcelId: "YE-22D-014",
    name: "Sector 22D Survey Block",
    location: "Sector 22D, Yamuna Expressway",
    locality: "Sector 22D",
    region: "Yamuna Expressway",
    pricePerSqYd: 28500,
    areaSqYd: 1000,
    distanceToAirportKm: 18.4,
    expresswayPhase: "II",
    growthPct: 19.2,
    confidencePct: 78,
    lat: 28.3124,
    lng: 77.5412,
    valuationNote:
      "Live composite from corridor comps + infra proximity weights. Estimate, not advice.",
    infraTimeline: [
      { year: 2027, event: "YEIDA arterial widening package", source: "YEIDA DPR" },
      { year: 2028, event: "Noida Airport cargo node soft open", source: "NIA brief" },
      { year: 2030, event: "Metro spur corridor alignment", source: "NMRC note" },
    ],
    transactions: [
      { date: "2025-11", rate: 26200, type: "resale" },
      { date: "2026-02", rate: 27450, type: "builder" },
      { date: "2026-06", rate: 28500, type: "resale" },
    ],
    imageHint: "expressway-edge",
  },
  {
    id: "tm-jw-a3-008",
    parcelId: "JW-A3-008",
    name: "Jewar Aerotropolis Plot A3",
    location: "Jewar Aerotropolis, Zone A3",
    locality: "Jewar",
    region: "Airport Node",
    pricePerSqYd: 42100,
    areaSqYd: 800,
    distanceToAirportKm: 4.2,
    expresswayPhase: "III",
    growthPct: 24.6,
    confidencePct: 71,
    lat: 28.1789,
    lng: 77.6121,
    valuationNote:
      "Airport adjacency premium applied with phase-gated absorption curve.",
    infraTimeline: [
      { year: 2026, event: "Runway 1 commercial ops", source: "NIA" },
      { year: 2028, event: "Aerocity landside retail shell", source: "Concessionaire" },
      { year: 2031, event: "Logistics park tranche B", source: "UPSIDC" },
    ],
    transactions: [
      { date: "2025-09", rate: 38800, type: "auction" },
      { date: "2026-01", rate: 40500, type: "resale" },
      { date: "2026-05", rate: 42100, type: "resale" },
    ],
    imageHint: "airport-approach",
  },
  {
    id: "tm-nd-phi-031",
    parcelId: "ND-PHI-031",
    name: "Noida Phi-3 Institutional Edge",
    location: "Greater Noida Phi-3",
    locality: "Phi-3",
    region: "Noida Extension",
    pricePerSqYd: 19800,
    areaSqYd: 1500,
    distanceToAirportKm: 32.1,
    expresswayPhase: "I",
    growthPct: 12.4,
    confidencePct: 82,
    lat: 28.4742,
    lng: 77.5040,
    valuationNote:
      "Lower volatility band — mature connectivity, slower uplift slope.",
    infraTimeline: [
      { year: 2026, event: "Knowledge park bus rapid link", source: "GNIDA" },
      { year: 2029, event: "Expressway feeder junction upgrade", source: "NHAI" },
    ],
    transactions: [
      { date: "2025-08", rate: 18600, type: "resale" },
      { date: "2026-03", rate: 19250, type: "builder" },
      { date: "2026-07", rate: 19800, type: "resale" },
    ],
    imageHint: "urban-grid",
  },
  {
    id: "tm-ye-18-102",
    parcelId: "YE-18-102",
    name: "Corridor Mile 18 Survey Lot",
    location: "YE Mile Marker 18",
    locality: "Mile 18",
    region: "Yamuna Expressway",
    pricePerSqYd: 22400,
    areaSqYd: 1200,
    distanceToAirportKm: 22.8,
    expresswayPhase: "II",
    growthPct: 16.8,
    confidencePct: 75,
    lat: 28.2651,
    lng: 77.5588,
    valuationNote: "Mid-corridor plot priced off phase-II comps + school node.",
    infraTimeline: [
      { year: 2027, event: "Service road dualization", source: "YEIDA" },
      { year: 2029, event: "Township utilities trunk", source: "Developer filing" },
      { year: 2032, event: "Regional school campus open", source: "Local notice" },
    ],
    transactions: [
      { date: "2025-12", rate: 21100, type: "resale" },
      { date: "2026-04", rate: 21800, type: "resale" },
      { date: "2026-07", rate: 22400, type: "builder" },
    ],
    imageHint: "survey-field",
  },
  {
    id: "tm-da-eco-006",
    parcelId: "DA-ECO-006",
    name: "Dadri Eco-Industrial Strip",
    location: "Dadri Industrial Belt",
    locality: "Dadri",
    region: "Industrial Belt",
    pricePerSqYd: 15600,
    areaSqYd: 2000,
    distanceToAirportKm: 27.5,
    expresswayPhase: "I",
    growthPct: 9.8,
    confidencePct: 84,
    lat: 28.5520,
    lng: 77.5543,
    valuationNote: "Industrial absorption model — income-yield biased scoring.",
    infraTimeline: [
      { year: 2026, event: "Power substation capacity add", source: "UPPCL" },
      { year: 2028, event: "Freight siding modernization", source: "DFCCIL" },
    ],
    transactions: [
      { date: "2025-10", rate: 14900, type: "lease-convert" },
      { date: "2026-02", rate: 15250, type: "resale" },
      { date: "2026-06", rate: 15600, type: "resale" },
    ],
    imageHint: "industrial",
  },
  {
    id: "tm-ye-mirz-011",
    parcelId: "YE-MIRZ-011",
    name: "Mirzapur Junction Parcel",
    location: "Mirzapur YE Junction",
    locality: "Mirzapur",
    region: "Yamuna Expressway",
    pricePerSqYd: 31200,
    areaSqYd: 900,
    distanceToAirportKm: 14.6,
    expresswayPhase: "III",
    growthPct: 21.1,
    confidencePct: 73,
    lat: 28.2410,
    lng: 77.5722,
    valuationNote: "Junction premium with phase-III acceleration window.",
    infraTimeline: [
      { year: 2027, event: "Cloverleaf grade separation", source: "NHAI" },
      { year: 2029, event: "Airport shuttle depot", source: "Operator RFP" },
      { year: 2031, event: "Mixed-use podium tranche", source: "YEIDA allotment" },
    ],
    transactions: [
      { date: "2025-11", rate: 29100, type: "auction" },
      { date: "2026-03", rate: 30200, type: "resale" },
      { date: "2026-07", rate: 31200, type: "resale" },
    ],
    imageHint: "junction",
  },
];

export const DEFAULT_FILTERS: ListingFilters = {
  location: "all",
  priceMin: 0,
  priceMax: 100000,
  airportMaxKm: 50,
  phase: "all",
};

export function filterListings(
  listings: PropertyListing[],
  filters: ListingFilters,
): PropertyListing[] {
  return listings.filter((item) => {
    if (filters.location !== "all" && item.region !== filters.location) {
      return false;
    }
    if (item.pricePerSqYd < filters.priceMin || item.pricePerSqYd > filters.priceMax) {
      return false;
    }
    if (item.distanceToAirportKm > filters.airportMaxKm) {
      return false;
    }
    if (filters.phase !== "all" && item.expresswayPhase !== filters.phase) {
      return false;
    }
    return true;
  });
}

export function getListingById(
  id: string,
  listings: PropertyListing[] = DUMMY_LISTINGS,
): PropertyListing | undefined {
  return listings.find((item) => item.id === id || item.parcelId === id);
}

export function uniqueRegions(listings: PropertyListing[]): string[] {
  return [...new Set(listings.map((item) => item.region))];
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRate(value: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(value)}/sq.yd`;
}
