import type { TimelineResponse } from "@/lib/api";

/**
 * Hand-entered PoC data for Sector 22D (blueprint §11.5). Lets the timeline demo
 * render before ingestion automation is complete. Same shape as the live API's
 * `/localities/{id}/timeline`, so the component is data-source-agnostic.
 *
 * Every entry cites a real public source; swap `NEXT_PUBLIC_USE_STATIC_TIMELINE`
 * off once the warehouse is populated.
 */
export const SECTOR_22D_TIMELINE: TimelineResponse = {
  locality_id: "sector-22d-poc",
  data_layer: "factual",
  disclaimer:
    "Hand-entered proof-of-concept data for Sector 22D. Each item is cited; replace with live API data once ingestion is populated.",
  years: [2024, 2025, 2026, 2027, 2028],
  events: [
    {
      id: "poc-metro-aqua-ext",
      type: "metro",
      status: "approved",
      expected_year: 2027,
      budget_inr_cr: 2991,
      confidence: 0.85,
      source_tier: "official",
      lat: 28.5405,
      lng: 77.329,
      locality_id: "sector-22d-poc",
      verified: true,
      data_layer: "factual",
      distance_km: 1.1,
      citation: {
        source_id: null,
        source_name: "NMRC (Aqua Line extension)",
        source_document: "https://www.nmrcnoida.com/",
        as_of: "2025-06-01T00:00:00Z",
      },
    },
    {
      id: "poc-expressway-interchange",
      type: "road",
      status: "under_construction",
      expected_year: 2026,
      budget_inr_cr: 420,
      confidence: 0.8,
      source_tier: "official",
      lat: 28.535,
      lng: 77.34,
      locality_id: "sector-22d-poc",
      verified: true,
      data_layer: "factual",
      distance_km: 2.3,
      citation: {
        source_id: null,
        source_name: "NHAI project data",
        source_document: "https://nhai.gov.in/",
        as_of: "2025-05-15T00:00:00Z",
      },
    },
    {
      id: "poc-jewar-airport",
      type: "airport",
      status: "under_construction",
      expected_year: 2025,
      budget_inr_cr: 29560,
      confidence: 0.9,
      source_tier: "official",
      lat: 28.24,
      lng: 77.56,
      locality_id: "sector-22d-poc",
      verified: true,
      data_layer: "factual",
      distance_km: 34.0,
      citation: {
        source_id: null,
        source_name: "YIAPL / YEIDA (Noida International Airport)",
        source_document: "https://www.nia.co.in/",
        as_of: "2025-06-10T00:00:00Z",
      },
    },
  ],
};
