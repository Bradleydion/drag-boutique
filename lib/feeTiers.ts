// lib/feeTiers.ts
// Single source of truth (client-side) for Sequins' volume-based sliding
// service fee: starts at 7%, floors at 4%. Ticket sales are tiered by how
// many shows a host has posted; marketplace/commission sales are tiered by
// how many items a seller has sold. Mirrors the tiering logic duplicated in
// the create-payment-intent / create-listing-payment-intent Edge Functions
// (Deno functions can't share a module with the app, so keep these in sync
// if the thresholds ever change).
//
// NOTE: thresholds are a placeholder pending final numbers from the founder.

export const FEE_TIERS: { threshold: number; percent: number }[] = [
  { threshold: 0,  percent: 0.07 },
  { threshold: 6,  percent: 0.06 },
  { threshold: 16, percent: 0.05 },
  { threshold: 31, percent: 0.04 },
];

export function feePercentForVolume(volume: number): number {
  let percent = FEE_TIERS[0].percent;
  for (const tier of FEE_TIERS) {
    if (volume >= tier.threshold) percent = tier.percent;
  }
  return percent;
}

/** The next tier up, or null if already at the lowest (floor) fee. */
export function nextTier(volume: number): { threshold: number; percent: number; remaining: number } | null {
  const next = FEE_TIERS.find(t => t.threshold > volume);
  if (!next) return null;
  return { threshold: next.threshold, percent: next.percent, remaining: next.threshold - volume };
}
