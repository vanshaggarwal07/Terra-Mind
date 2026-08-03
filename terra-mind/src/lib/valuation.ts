import type { ExpresswayPhase, ValuationInputs } from "@/lib/types";

const PHASE_MULTIPLIER: Record<ExpresswayPhase, number> = {
  I: 1.0,
  II: 1.08,
  III: 1.16,
  IV: 1.22,
};

/** Survey-style land value model for the calculator / 3D block height. */
export function computeParcelValue(inputs: ValuationInputs): {
  currentValue: number;
  projectedValue: number;
  upliftPct: number;
  blockHeight: number;
} {
  const distanceFactor = Math.max(0.55, 1.35 - inputs.distanceKm * 0.018);
  const phaseFactor = PHASE_MULTIPLIER[inputs.phase];
  const currentValue = Math.round(inputs.baseRate * distanceFactor * phaseFactor);

  const annualGrowth =
    0.045 +
    (inputs.phase === "III" || inputs.phase === "IV" ? 0.02 : 0.01) +
    Math.max(0, (25 - inputs.distanceKm) * 0.0015);

  const projectedValue = Math.round(
    currentValue * Math.pow(1 + annualGrowth, inputs.years),
  );
  const upliftPct = ((projectedValue - currentValue) / currentValue) * 100;
  const blockHeight = Math.min(6.5, Math.max(0.8, projectedValue / 12000));

  return { currentValue, projectedValue, upliftPct, blockHeight };
}
