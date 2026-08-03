/**
 * Place gazetteer for the Terra-Mind corridor and ~100 km surrounding ring.
 * Relevance is keyword-based (no lat/lon API). Places are chosen around the
 * Noida / Greater Noida / YEIDA / Jewar core so district + NCR-east news is kept.
 */
export const CORRIDOR_KEYWORDS = [
  // Core corridor
  "jewar",
  "noida international airport",
  "noida airport",
  "jewar airport",
  "yamuna expressway",
  "yeida",
  "noida",
  "greater noida",
  "gnida",
  "noida extension",
  "greater noida west",
  "noida authority",
  "greater noida authority",
  // Jaypee / sports city cluster
  "jaypee sports city",
  "jaypee greens",
  "wish town",
  "jaypee infratech",
  "sports city",
  "film city",
  "knowledge park",
  // Core sectors / landmarks
  "sector 150",
  "sector 128",
  "sector 137",
  "sector 143",
  "sector 144",
  "sector 168",
  "sector 62",
  "sector 18",
  "botanical garden",
  "pari chowk",
  "jagat farm",
  "kasna",
  "alpha commercial",
  // Transit
  "aqua line",
  "noida metro",
  "nmrc",
  "rrts",
  "delhi meerut",
  "delhi-meerut",
  "eastern peripheral",
  "epe expressway",
  // ~100 km ring: Gautam Buddh Nagar & YEIDA belt
  "gautam buddh nagar",
  "gautam buddha nagar",
  "gbnagar",
  "gb nagar",
  "dadri",
  "tappal",
  "dankaur",
  "surajpur",
  "ecotech",
  "bisrakh",
  "jahangirpur",
  "rabupura",
  "jewar tehsil",
  // Bulandshahr / Khurja belt (airport / expressway catchment)
  "bulandshahr",
  "bulandshahar",
  "khurja",
  "sikandrabad",
  "sikandarabad",
  "jahangirabad",
  "anupshahr",
  // Ghaziabad / NCR-east fringe
  "ghaziabad",
  "indirapuram",
  "vaishali",
  "crossing republik",
  "raj nagar extension",
  "sahibabad",
  "loni",
  "dasna",
  "modinagar",
  "muradnagar",
  // Faridabad / south fringe (within ~100 km of Noida core)
  "faridabad",
  "ballabhgarh",
  "palwal",
  // Other nearby nodes often in corridor coverage
  "hapur",
  "pilkhuwa",
  "garhmukteshwar",
  "mathura road",
  "okhla",
  "mayur vihar",
  "kalindi kunj",
  "delhi ncr",
  "ncr noida",
] as const;

export function isCorridorRelevant(headline: string, body = ""): boolean {
  const text = `${headline}\n${body}`.toLowerCase();
  return CORRIDOR_KEYWORDS.some((kw) => text.includes(kw));
}
