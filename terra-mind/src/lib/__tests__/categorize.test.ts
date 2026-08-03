import { describe, expect, it } from "vitest";

import { categorize } from "@/lib/news/categorize";
import { headlineDistance } from "@/lib/news/dedupe";

describe("categorize", () => {
  it("tags Jewar Airport stories", () => {
    expect(
      categorize("Noida International Airport at Jewar nears runway test"),
    ).toBe("jewar-airport");
  });

  it("tags metro stories", () => {
    expect(categorize("Noida Metro Aqua Line extension approved")).toBe(
      "metro",
    );
  });

  it("tags Noida and Jaypee Sports City", () => {
    expect(categorize("Noida Authority notifies Sector 150 FAR revision")).toBe(
      "noida",
    );
    expect(
      categorize("Jaypee Sports City buyers await possession timeline"),
    ).toBe("jaypee-sports-city");
    expect(categorize("GNIDA opens Knowledge Park industrial scheme")).toBe(
      "greater-noida",
    );
  });

  it("tags 100km ring places", () => {
    expect(categorize("Bulandshahr industrial park attracts new units")).toBe(
      "nearby-100km",
    );
    expect(
      categorize("Ghaziabad housing demand rises in Indirapuram belt"),
    ).toBe("nearby-100km");
  });

  it("falls back to general", () => {
    expect(categorize("Weather remains mild across northern plains")).toBe(
      "general",
    );
  });
});

describe("headlineDistance", () => {
  it("treats identical headlines as distance 0", () => {
    expect(headlineDistance("YEIDA plot scheme", "YEIDA plot scheme")).toBe(0);
  });

  it("scores near-duplicates low", () => {
    const d = headlineDistance(
      "Jewar Airport terminal work accelerates",
      "Jewar Airport terminal work accelerates!",
    );
    expect(d).toBeLessThan(0.18);
  });
});
