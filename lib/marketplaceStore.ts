// lib/marketplaceStore.ts
// Marketplace store backed by Supabase `listings` table.
// Seed data is always shown as a baseline; real user listings are merged on top.
//
// Required Supabase table — see SQL in docs.

import { getSession } from './authStore';
import { supabase } from './supabase';

export type ListingCategory =
  | 'wigs'
  | 'dresses'
  | 'accessories'
  | 'shoes'
  | 'commissions';

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair';

export type ListingType = 'sale' | 'swap' | 'commission';

export interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerRole: 'artist' | 'host';
  category: ListingCategory;
  type: ListingType;
  title: string;
  description: string;
  price: number;
  condition?: ListingCondition;
  imageUrls: string[];
  tags: string[];
  location?: string;
  shipsNationwide: boolean;
  localPickup: boolean;
  createdAt: string;
  sold: boolean;
  buyerId?: string;
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'refund_requested' | 'refunded' | 'failed';
  stripePaymentIntentId?: string;
  platformFeePercent?: number;
  platformFeeAmount?: number;
  refundReason?: string;
  refundRequestedAt?: string;
  stripeRefundId?: string;
  refundWindowDays?: number;
  allSalesFinal?: boolean;
  purchasedAt?: string;
}

// ── Seed data (always visible as demo content) ────────────────────────────────

const SEED_LISTINGS: Listing[] = [
  {
    id: 'seed-l1',
    sellerId: 'seed1',
    sellerName: 'Nova Luxe',
    sellerRole: 'artist',
    category: 'wigs',
    type: 'sale',
    title: 'Platinum Bombshell Lace Front',
    description: 'Worn twice. 30" platinum blonde lace front, heat resistant. Comes with wig cap and storage bag.',
    price: 85,
    condition: 'like_new',
    imageUrls: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600'],
    tags: ['blonde', 'lace front', 'long'],
    location: 'Los Angeles, CA',
    shipsNationwide: true,
    localPickup: true,
    createdAt: '2026-04-01T00:00:00Z',
    sold: false,
  },
  {
    id: 'seed-l2',
    sellerId: 'seed2',
    sellerName: 'Crimson Dahlia',
    sellerRole: 'artist',
    category: 'dresses',
    type: 'sale',
    title: 'Sequined Scarlet Gown',
    description: 'Full-length red sequin gown, size M. Built-in corset, side slit. Worn for one performance.',
    price: 220,
    condition: 'like_new',
    imageUrls: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600'],
    tags: ['red', 'sequin', 'gown', 'corset'],
    location: 'New York, NY',
    shipsNationwide: true,
    localPickup: false,
    createdAt: '2026-04-03T00:00:00Z',
    sold: false,
  },
  {
    id: 'seed-l3',
    sellerId: 'seed3',
    sellerName: 'Glitter Bomb',
    sellerRole: 'artist',
    category: 'accessories',
    type: 'sale',
    title: 'Rhinestone Choker Set (3pc)',
    description: 'Three crystal chokers in gold, silver, and rose gold. Never worn. Perfect for any look.',
    price: 45,
    condition: 'new',
    imageUrls: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600'],
    tags: ['jewelry', 'rhinestone', 'choker', 'gold'],
    location: 'Chicago, IL',
    shipsNationwide: true,
    localPickup: true,
    createdAt: '2026-04-05T00:00:00Z',
    sold: false,
  },
  {
    id: 'seed-l4',
    sellerId: 'seed4',
    sellerName: 'Velvet Voltage',
    sellerRole: 'artist',
    category: 'shoes',
    type: 'sale',
    title: 'Platform Thigh-High Boots — Size 11',
    description: 'Black patent leather, 6" platform. Some minor scuffing on heel. Great stage presence.',
    price: 130,
    condition: 'good',
    imageUrls: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600'],
    tags: ['boots', 'platform', 'black', 'patent'],
    location: 'Miami, FL',
    shipsNationwide: true,
    localPickup: true,
    createdAt: '2026-04-06T00:00:00Z',
    sold: false,
  },
  {
    id: 'seed-l5',
    sellerId: 'seed5',
    sellerName: 'Madam Stitch',
    sellerRole: 'artist',
    category: 'commissions',
    type: 'commission',
    title: 'Custom Drag Costume — Full Build',
    description: 'I build complete custom drag looks from scratch. Corsets, skirts, bodysuits, headpieces. DM for a quote based on your vision.',
    price: 0,
    imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'],
    tags: ['custom', 'sewing', 'corset', 'headpiece'],
    location: 'Atlanta, GA',
    shipsNationwide: true,
    localPickup: false,
    createdAt: '2026-04-07T00:00:00Z',
    sold: false,
  },
];

// ── Row mapping (snake_case DB → camelCase app) ───────────────────────────────

function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id:              row.id as string,
    sellerId:        row.seller_id as string,
    sellerName:      row.seller_name as string,
    sellerRole:      row.seller_role as 'artist' | 'host',
    category:        row.category as ListingCategory,
    type:            row.type as ListingType,
    title:           row.title as string,
    description:     row.description as string,
    price:           Number(row.price),
    condition:       row.condition as ListingCondition | undefined,
    imageUrls:       (row.image_urls as string[]) ?? [],
    tags:            (row.tags as string[]) ?? [],
    location:        row.location as string | undefined,
    shipsNationwide: Boolean(row.ships_nationwide),
    localPickup:     Boolean(row.local_pickup),
    createdAt:       row.created_at as string,
    sold:            Boolean(row.sold),
    buyerId:         row.buyer_id as string | undefined,
    paymentStatus:   row.payment_status as 'unpaid' | 'pending' | 'paid' | 'refund_requested' | 'refunded' | 'failed' | undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id as string | undefined,
    platformFeePercent:    row.platform_fee_percent != null ? Number(row.platform_fee_percent) : undefined,
    platformFeeAmount:     row.platform_fee_amount != null ? Number(row.platform_fee_amount) : undefined,
    refundReason:          row.refund_reason as string | undefined,
    refundRequestedAt:     row.refund_requested_at as string | undefined,
    stripeRefundId:        row.stripe_refund_id as string | undefined,
    refundWindowDays:      row.refund_window_days != null ? Number(row.refund_window_days) : undefined,
    allSalesFinal:         Boolean(row.all_sales_final),
    purchasedAt:           row.purchased_at as string | undefined,
  };
}

// ── Local cache ───────────────────────────────────────────────────────────────

// Real listings fetched from Supabase (keyed by id for dedup)
let _dbListings: Map<string, Listing> = new Map();
let _loaded = false;

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/** Load real listings from Supabase. Safe to call without a session (public read). */
export async function loadListings(): Promise<void> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('sold', false)
    .order('created_at', { ascending: false });

  if (!error && data) {
    _dbListings = new Map(data.map((r: Record<string, unknown>) => {
      const l = rowToListing(r);
      return [l.id, l];
    }));
  }
  _loaded = true;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** All active listings — real DB listings first, then seeds for any not already covered. */
export function getListings(category?: ListingCategory): Listing[] {
  const dbArr = Array.from(_dbListings.values());
  // Merge: show DB listings + seed listings whose id doesn't collide
  const dbIds = new Set(dbArr.map(l => l.id));
  const seeds = SEED_LISTINGS.filter(s => !dbIds.has(s.id) && !s.sold);
  const all = [...dbArr, ...seeds];
  if (category) return all.filter(l => l.category === category);
  return all;
}

export function getListing(id: string): Listing | undefined {
  return _dbListings.get(id) ?? SEED_LISTINGS.find(l => l.id === id);
}

/** Listings created by the current authenticated user. */
export function getMyListings(): Listing[] {
  const session = getSession();
  if (!session) return [];
  return Array.from(_dbListings.values()).filter(l => l.sellerId === session.user.id);
}

export function listingsLoaded(): boolean {
  return _loaded;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createListing(
  data: Omit<Listing, 'id' | 'createdAt' | 'sold'>,
): Promise<Listing> {
  const session = getSession();
  if (!session) throw new Error('Must be signed in to create a listing.');

  const { data: row, error } = await supabase
    .from('listings')
    .insert({
      seller_id:        session.user.id,
      seller_name:      data.sellerName,
      seller_role:      data.sellerRole,
      category:         data.category,
      type:             data.type,
      title:            data.title,
      description:      data.description,
      price:            data.price,
      condition:        data.condition ?? null,
      image_urls:       data.imageUrls,
      tags:             data.tags,
      location:         data.location ?? null,
      ships_nationwide: data.shipsNationwide,
      local_pickup:     data.localPickup,
    })
    .select()
    .single();

  if (error) throw error;

  const listing = rowToListing(row as Record<string, unknown>);
  _dbListings.set(listing.id, listing);
  return listing;
}

export async function markSold(id: string): Promise<void> {
  const session = getSession();
  if (!session) throw new Error('Must be signed in to mark a listing as sold.');

  const { error } = await supabase
    .from('listings')
    .update({ sold: true })
    .eq('id', id)
    .eq('seller_id', session.user.id);

  if (!error) {
    _dbListings.delete(id);
  }
}

// ── Stripe: buy a listing (marketplace sale, swap, or priced commission) ─────

/**
 * Calls the Supabase Edge Function to create a Stripe PaymentIntent for a
 * marketplace listing purchase. The seller's cut is sent directly to their
 * Stripe Connect account; Sequins' service fee (7%→4% by seller volume) is
 * collected automatically as the destination charge's application fee.
 */
export async function createListingPaymentIntent(
  listingId: string,
): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  platformFeePercent: number;
  platformFeeAmount: number;
}> {
  const session = getSession();
  if (!session) throw new Error('Must be signed in to buy a listing.');

  const { data, error } = await supabase.functions.invoke('create-listing-payment-intent', {
    body: { listingId },
  });

  if (error) throw new Error(error.message ?? 'Could not initialise payment.');
  if (!data?.clientSecret) throw new Error('Invalid response from payment service.');

  return {
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
    platformFeePercent: data.platformFeePercent ?? 0,
    platformFeeAmount: data.platformFeeAmount ?? 0,
  };
}

/** Record a listing purchase in Supabase after Stripe payment succeeds. */
export async function buyListing(
  id: string,
  paymentIntentId: string,
  platformFeePercent: number,
  platformFeeAmount: number,
): Promise<void> {
  const session = getSession();
  if (!session) throw new Error('Must be signed in to buy a listing.');

  const { error } = await supabase
    .from('listings')
    .update({
      sold: true,
      buyer_id: session.user.id,
      payment_status: 'paid',
      stripe_payment_intent_id: paymentIntentId,
      platform_fee_percent: platformFeePercent,
      platform_fee_amount: platformFeeAmount,
      purchased_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('sold', false); // guard against double-purchase races

  if (error) throw error;
  _dbListings.delete(id);
}

export async function deleteListing(id: string): Promise<void> {
  const session = getSession();
  if (!session) throw new Error('Must be signed in to delete a listing.');

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)
    .eq('seller_id', session.user.id);

  if (!error) {
    _dbListings.delete(id);
  }
}

// ── Fee tier volume ────────────────────────────────────────────────────────────

/** Total items this seller has sold on Sequins -- drives the commission/sale fee tier. */
export async function getSellerSoldCount(sellerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .eq('sold', true);
  return error ? 0 : (count ?? 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<ListingCategory, { label: string; emoji: string }> = {
  wigs:        { label: 'Wigs',        emoji: '👱' },
  dresses:     { label: 'Dresses',     emoji: '👗' },
  accessories: { label: 'Accessories', emoji: '💍' },
  shoes:       { label: 'Shoes',       emoji: '👠' },
  commissions: { label: 'Commissions', emoji: '🧵' },
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new:      'New',
  like_new: 'Like New',
  good:     'Good',
  fair:     'Fair',
};

// ─── Refunds ──────────────────────────────────────────────────────────────────
// Same buyer-requests / seller-approves flow as ticket refunds (see
// ticketStore.ts), applied to marketplace purchases.

export async function requestListingRefund(listingId: string, reason?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('process-refund', {
    body: { itemType: 'listing', itemId: listingId, action: 'request', reason },
  });
  if (error) throw new Error(error.message ?? 'Could not submit refund request.');
}

export async function approveListingRefund(listingId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('process-refund', {
    body: { itemType: 'listing', itemId: listingId, action: 'approve' },
  });
  if (error) throw new Error(error.message ?? 'Could not process refund.');
}

/** Buyer: everything they've purchased on the marketplace (fresh from Supabase, not the local cache). */
export async function loadMyPurchases(): Promise<Listing[]> {
  const session = getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('buyer_id', session.user.id)
    .order('purchased_at', { ascending: false });

  if (error || !data) return [];
  return data.map((r: Record<string, unknown>) => rowToListing(r));
}

/** Seller: pending refund requests on their listings. */
export async function loadSellerRefundRequests(sellerId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('payment_status', 'refund_requested')
    .order('refund_requested_at', { ascending: true });

  if (error || !data) return [];
  return data.map((r: Record<string, unknown>) => rowToListing(r));
}

export async function denyListingRefund(listingId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('process-refund', {
    body: { itemType: 'listing', itemId: listingId, action: 'deny' },
  });
  if (error) throw new Error(error.message ?? 'Could not deny refund.');
}
