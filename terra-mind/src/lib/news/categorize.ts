import type { NewsCategory } from "./types";

type Rule = { category: NewsCategory; keywords: string[] };

/** First match wins — more specific location/infra rules before generic ones. */
const RULES: Rule[] = [
  {
    category: "jewar-airport",
    keywords: [
      "jewar",
      "noida international airport",
      "noida airport",
      "nia jewar",
      "civil aviation jewar",
    ],
  },
  {
    category: "jaypee-sports-city",
    keywords: [
      "jaypee sports city",
      "jaypee greens",
      "wish town",
      "jaypee infratech",
      "jaypee wishtown",
      "sports city noida",
      "sports city greater noida",
    ],
  },
  {
    category: "metro",
    keywords: [
      "noida metro",
      "aqua line",
      "nmrc",
      "rapid rail",
      "rrts",
      "metro extension",
    ],
  },
  {
    category: "yamuna-expressway",
    keywords: [
      "yamuna expressway",
      "yeida",
      "yamuna express",
      "expressway authority",
    ],
  },
  {
    category: "greater-noida",
    keywords: [
      "greater noida",
      "gnida",
      "knowledge park",
      "alpha commercial",
      "pari chowk",
      "jagat farm",
      "sector gamma",
      "sector zeta",
      "noida extension",
      "greater noida west",
      "kasna",
      "ecotech",
      "surajpur",
    ],
  },
  {
    category: "noida",
    keywords: [
      "noida authority",
      "noida",
      "sector 150",
      "sector 128",
      "sector 137",
      "sector 143",
      "sector 144",
      "sector 168",
      "film city",
      "botanical garden",
      "sector 62",
      "sector 18",
    ],
  },
  {
    category: "nearby-100km",
    keywords: [
      "gautam buddh nagar",
      "gautam buddha nagar",
      "gb nagar",
      "dadri",
      "tappal",
      "dankaur",
      "bulandshahr",
      "bulandshahar",
      "khurja",
      "sikandrabad",
      "sikandarabad",
      "ghaziabad",
      "indirapuram",
      "vaishali",
      "crossing republik",
      "faridabad",
      "ballabhgarh",
      "palwal",
      "hapur",
      "modinagar",
      "muradnagar",
      "dasna",
      "eastern peripheral",
      "epe",
      "bisrakh",
      "rabupura",
    ],
  },
  {
    category: "govt-schemes",
    keywords: [
      "scheme",
      "allotment",
      "draw of lots",
      "lottery",
      "plot scheme",
      "housing scheme",
      "pmay",
      "policy",
      "notification",
      "tender",
    ],
  },
  {
    category: "builders",
    keywords: [
      "builder",
      "developer",
      "ats",
      "godrej",
      "dle",
      "gaurs",
      "ace",
      "supertech",
      "jaypee",
      "logos",
      "realty",
      "galaxy",
      "migsun",
      "bhutani",
    ],
  },
  {
    category: "new-launches",
    keywords: [
      "launch",
      "launches",
      "new project",
      "pre-launch",
      "booking open",
      "soft launch",
    ],
  },
];

export function categorize(headline: string, body = ""): NewsCategory {
  const text = `${headline}\n${body}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.category;
    }
  }
  return "general";
}
