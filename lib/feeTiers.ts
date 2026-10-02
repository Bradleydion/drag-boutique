// lib/feeTiers.ts
// Client-side copy of Sequins' service fee model (Oct 2026). Used for the
// host/seller fee dashboard. The real charge is always calculated on the
// server by the create-payment-intent / create-listing-payment-intent Edge
// Functions (Deno functions can't share a module with the app, so keep these
// in sync if the numbers change).
//
// How it works:
//   - The BUYER pays the service fee on top of the ticket or item price.
//   - The host or seller gets 100% of their price. Sequins covers Stripe's
//     card processing fee out of the service fee.
//   - fee = tier % of the price + $0.50, never less than $0.99. Free = $0.
//   - The tier is set by paid sales so far this calendar month.
//   - The service fee is non-refundable.

export type FeeTier = { threshold: number; percent: number; name: string };

export const FEE_TIERS: FeeTier[] = [
  { threshold: 0,   percent: 0.07, name: 'Opening Act' },
  { threshold: 100, percent: 0.06, name: 'Featured' },
  { threshold: 250, percent: 0.05, name: 'Headliner' },
  { threshold: 500, percent: 0.04, name: 'Icon' },
];

export const FLAT_FEE = 0.5;
export const MIN_FEE = 0.99;

export function tierForVolume(monthlySales: number): FeeTier {
  let tier = FEE_TIERS[0];
  for (const t of FEE_TIERS) if (monthlySales >= t.threshold) tier = t;
  return tier;
}

export function feePercentForVolume(monthlySales: number): number {
  return tierForVolume(monthlySales).percent;
}

/** Service fee in dollars for a given price at a given tier. */
export function serviceFee(price: number, percent: number): number {
  if (price <= 0) return 0;
  const cents = Math.max(Math.round(MIN_FEE * 100), Math.round(price * 100 * percent) + Math.round(FLAT_FEE * 100));
  return cents / 100;
}

/** "7% + $0.50" */
export function feeLabel(percent: number): string {
  return `${Math.round(percent * 100)}% + $${FLAT_FEE.toFixed(2)}`;
}

/** The next tier up, or null if already at the lowest fee. */
export function nextTier(monthlySales: number): (FeeTier & { remaining: number }) | null {
  const next = FEE_TIERS.find(t => t.threshold > monthlySales);
  if (!next) return null;
  return { ...next, remaining: next.threshold - monthlySales };
}

/** Start of the current calendar month in UTC (matches the server). */
export function monthStartUtcIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * The non-refundable service fee the buyer paid on top of `price`, or 0 for
 * purchases made before this fee model (when the fee came out of the
 * seller's price and was refunded with it). Old fees were exactly
 * percent × price; new fees always include the extra $0.50 (or the $0.99
 * minimum), so they're at least ~$0.49 higher.
 */
export function keptServiceFee(price: number, feePercent?: number | null, feeAmount?: number | null): number {
  const fee = Number(feeAmount ?? 0);
  if (!fee || price <= 0) return 0;
  const oldStyleFee = Math.round(price * Number(feePercent ?? 0) * 100) / 100;
  return fee > oldStyleFee + 0.004 ? fee : 0;
}
