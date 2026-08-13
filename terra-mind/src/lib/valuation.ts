import type { ExpresswayPhase, ValuationInputs } from "@/lib/types";

const PHASE_MULTIPLIER: Record<ExpresswayPhase, number> = {
  I: 1.0,
  II: 1.08,
  III: 1.16,
  IV: 1.22,
};

/**
 * Annual growth rate of the corridor projection model: a base corridor rate
 * plus phase acceleration plus airport-proximity premium. Kept as a single
 * function so the calculator and any future surface project identically.
 */
export function annualGrowthRate(
  distanceKm: number,
  phase: ExpresswayPhase,
): number {
  return (
    0.045 +
    (phase === "III" || phase === "IV" ? 0.02 : 0.01) +
    Math.max(0, (25 - distanceKm) * 0.0015)
  );
}

/** Survey-style land value model used by the calculator. */
export function computeParcelValue(inputs: ValuationInputs): {
  currentValue: number;
  projectedValue: number;
  upliftPct: number;
  blockHeight: number;
} {
  const distanceFactor = Math.max(0.55, 1.35 - inputs.distanceKm * 0.018);
  const phaseFactor = PHASE_MULTIPLIER[inputs.phase];
  const currentValue = Math.round(inputs.baseRate * distanceFactor * phaseFactor);

  const annualGrowth = annualGrowthRate(inputs.distanceKm, inputs.phase);

  const projectedValue = Math.round(
    currentValue * Math.pow(1 + annualGrowth, inputs.years),
  );
  const upliftPct = ((projectedValue - currentValue) / currentValue) * 100;
  const blockHeight = Math.min(6.5, Math.max(0.8, projectedValue / 12000));

  return { currentValue, projectedValue, upliftPct, blockHeight };
}

export interface GrowthPoint {
  /** Months from the start of the series. */
  monthOffset: number;
  value: number;
}

export interface WealthProjection {
  finalValue: number;
  profit: number;
  upliftPct: number;
  /** Model growth rate, which for compounding equals the CAGR. */
  cagrPct: number;
  points: GrowthPoint[];
}

/**
 * Forward mode: an invested amount compounded under the corridor growth
 * model, returned as a year-by-year path plus a final fractional point when
 * the horizon is not a whole number of years.
 */
export function projectInvestment(input: {
  amount: number;
  months: number;
  distanceKm: number;
  phase: ExpresswayPhase;
}): WealthProjection {
  const growth = annualGrowthRate(input.distanceKm, input.phase);
  const valueAt = (m: number) =>
    Math.round(input.amount * Math.pow(1 + growth, m / 12));

  const points: GrowthPoint[] = [];
  for (let m = 0; m <= input.months; m += 12) {
    points.push({ monthOffset: m, value: valueAt(m) });
  }
  if (points[points.length - 1].monthOffset !== input.months) {
    points.push({ monthOffset: input.months, value: valueAt(input.months) });
  }

  const finalValue = points[points.length - 1].value;
  return {
    finalValue,
    profit: finalValue - input.amount,
    upliftPct: ((finalValue - input.amount) / input.amount) * 100,
    cagrPct: growth * 100,
    points,
  };
}

/** "YYYY-MM" → absolute month index for date arithmetic. */
function monthIndex(date: string): number {
  const [year, month] = date.split("-").map(Number);
  return year * 12 + (month - 1);
}

export interface LedgerLookback {
  entryDate: string;
  entryRate: number;
  exitDate: string;
  exitRate: number;
  finalValue: number;
  profit: number;
  upliftPct: number;
  cagrPct: number;
  heldMonths: number;
  /** True when the requested horizon predates the ledger, so entry was clamped to its first record. */
  clampedToLedgerStart: boolean;
  points: (GrowthPoint & { date: string; rate: number })[];
}

/**
 * Past mode: what an amount invested `months` ago would be worth at the
 * latest registered rate. Pure ledger arithmetic — entry is the last
 * transaction on or before the target date (clamped to the first record when
 * the horizon predates the ledger), exit is the newest record. No modelling.
 */
export function lookbackFromLedger(input: {
  amount: number;
  months: number;
  transactions: { date: string; rate: number }[];
}): LedgerLookback | null {
  const ledger = input.transactions;
  if (ledger.length < 2) return null;

  const exit = ledger[ledger.length - 1];
  const targetIndex = monthIndex(exit.date) - input.months;

  let entry = ledger[0];
  for (const tx of ledger) {
    if (monthIndex(tx.date) <= targetIndex) entry = tx;
  }
  const clampedToLedgerStart = monthIndex(ledger[0].date) > targetIndex;

  const entryIdx = ledger.indexOf(entry);
  const held = ledger.slice(entryIdx);
  if (held.length < 2) return null;

  const entryMonth = monthIndex(entry.date);
  const points = held.map((tx) => ({
    monthOffset: monthIndex(tx.date) - entryMonth,
    value: Math.round((input.amount * tx.rate) / entry.rate),
    date: tx.date,
    rate: tx.rate,
  }));

  const finalValue = points[points.length - 1].value;
  const heldMonths = Math.max(1, monthIndex(exit.date) - entryMonth);
  const growthRatio = exit.rate / entry.rate;

  return {
    entryDate: entry.date,
    entryRate: entry.rate,
    exitDate: exit.date,
    exitRate: exit.rate,
    finalValue,
    profit: finalValue - input.amount,
    upliftPct: (growthRatio - 1) * 100,
    cagrPct: (Math.pow(growthRatio, 12 / heldMonths) - 1) * 100,
    heldMonths,
    clampedToLedgerStart,
    points,
  };
}
