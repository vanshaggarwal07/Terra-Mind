import { describe, expect, it } from "vitest";

import {
  DUMMY_LISTINGS,
  DEFAULT_FILTERS,
  filterListings,
  getListingById,
} from "@/lib/listings";

describe("filterListings", () => {
  it("filters by airport distance", () => {
    const result = filterListings(DUMMY_LISTINGS, {
      ...DEFAULT_FILTERS,
      airportMaxKm: 10,
    });
    expect(result.every((item) => item.distanceToAirportKm <= 10)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by expressway phase", () => {
    const result = filterListings(DUMMY_LISTINGS, {
      ...DEFAULT_FILTERS,
      phase: "III",
    });
    expect(result.every((item) => item.expresswayPhase === "III")).toBe(true);
  });

  it("resolves listing by id or parcel id", () => {
    const byId = getListingById("tm-ye-22d-014");
    const byParcel = getListingById("YE-22D-014");
    expect(byId?.parcelId).toBe("YE-22D-014");
    expect(byParcel?.id).toBe("tm-ye-22d-014");
  });
});
