import { cache } from "react";
import { google } from "googleapis";

import type { ActivityPayload, PropertyListing } from "@/lib/types";
import { DUMMY_LISTINGS } from "@/lib/listings";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!email || !privateKey || !spreadsheetId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { auth, spreadsheetId };
}

/** Optional numeric cell — empty/missing column degrades to undefined. */
function optionalNumber(cell: string | undefined): number | undefined {
  if (cell === undefined || cell === "") return undefined;
  const value = Number(cell);
  return Number.isFinite(value) ? value : undefined;
}

function optionalString(cell: string | undefined): string | undefined {
  return cell ? cell : undefined;
}

function mapRowToListing(row: string[], index: number): PropertyListing | null {
  if (!row[0]) return null;
  return {
    id: row[0],
    parcelId: row[1] || row[0],
    name: row[2] || "Unnamed parcel",
    location: row[3] || "",
    locality: row[4] || "",
    region: row[5] || "Yamuna Expressway",
    pricePerSqYd: Number(row[6] || 0),
    areaSqYd: Number(row[7] || 0),
    distanceToAirportKm: Number(row[8] || 0),
    expresswayPhase: (row[9] as PropertyListing["expresswayPhase"]) || "II",
    growthPct: Number(row[10] || 0),
    confidencePct: Number(row[11] || 0),
    lat: Number(row[12] || 0),
    lng: Number(row[13] || 0),
    valuationNote: row[14] || "Sheet-sourced valuation note.",
    infraTimeline: [
      {
        year: Number(row[15] || 2028),
        event: row[16] || "Infrastructure update",
        source: row[17] || "Sheet",
      },
    ],
    transactions: [
      {
        date: row[18] || "2026-01",
        rate: Number(row[6] || 0),
        type: row[19] || "resale",
      },
    ],
    imageHint: row[20] || `sheet-${index}`,
    // Optional columns V:AC — missing sheet columns degrade gracefully.
    distanceToFilmCityKm: optionalNumber(row[21]),
    driveMinutesToAirport: optionalNumber(row[22]),
    driveMinutesToFilmCity: optionalNumber(row[23]),
    reraId: optionalString(row[24]),
    titleVerified: row[25]
      ? ["true", "yes", "1"].includes(row[25].toLowerCase())
      : undefined,
    verifiedOn: optionalString(row[26]),
    verificationNotes: optionalString(row[27]),
  };
}

export async function fetchListingsFromSheet(): Promise<{
  listings: PropertyListing[];
  source: "sheets" | "fallback";
}> {
  const creds = getAuth();
  if (!creds) {
    return { listings: DUMMY_LISTINGS, source: "fallback" };
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: creds.auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: creds.spreadsheetId,
      range: "Listings!A2:AC",
    });

    const rows = response.data.values ?? [];
    const listings = rows
      .map((row, index) => mapRowToListing(row.map(String), index))
      .filter((item): item is PropertyListing => item !== null);

    if (listings.length === 0) {
      return { listings: DUMMY_LISTINGS, source: "fallback" };
    }

    return { listings, source: "sheets" };
  } catch {
    return { listings: DUMMY_LISTINGS, source: "fallback" };
  }
}

/** Request-scoped memo so page + generateMetadata share one Sheets fetch. */
export const getListings = cache(fetchListingsFromSheet);

export async function appendActivityRow(
  payload: ActivityPayload,
): Promise<{ ok: boolean; mode: "sheets" | "local" }> {
  const creds = getAuth();
  const row = [
    new Date().toISOString(),
    payload.action,
    payload.propertyId ?? "",
    payload.name ?? "",
    payload.email ?? "",
    payload.phone ?? "",
    payload.message ?? "",
    JSON.stringify(payload.meta ?? {}),
  ];

  if (!creds) {
    console.info("[sheets-sync:local]", row);
    return { ok: true, mode: "local" };
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: creds.auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: creds.spreadsheetId,
      range: "Activity!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    return { ok: true, mode: "sheets" };
  } catch (error) {
    console.error("[sheets-sync:error]", error);
    return { ok: false, mode: "sheets" };
  }
}
