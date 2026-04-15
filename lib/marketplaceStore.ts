// lib/marketplaceStore.ts
// In-memory marketplace store for MVP.
// Listings are created by Artists and Hosts; browsable by all roles.

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
  sellerId: string;       // userId of the creator
  sellerName: string;
  sellerRole: 'artist' | 'host';
  category: ListingCategory;
  type: ListingType;
  title: string;
  description: string;
  price: number;          // 0 = open to offers / commission quote
  condition?: ListingCondition;
  imageUrls: string[];
  tags: string[];
  location?: string;      // city, e.g. "Los Angeles, CA"
  shipsNationwide: boolean;
  localPickup: boolean;
  createdAt: string;      // ISO date string
  sold: boolean;
}

// ── Seed data ────────────────────────────────────────────────────────────────

const SEED_LISTINGS: Listing[] = [
  {
    id: 'l1',
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
    id: 'l2',
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
    id: 'l3',
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
    id: 'l4',
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
    id: 'l5',
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

// ── Store ─────────────────────────────────────────────────────────────────────

let _listings: Listing[] = [...SEED_LISTINGS];
let _nextId = 100;

export function getListings(category?: ListingCategory): Listing[] {
  const active = _listings.filter(l => !l.sold);
  if (category) return active.filter(l => l.category === category);
  return active;
}

export function getListing(id: string): Listing | undefined {
  return _listings.find(l => l.id === id);
}

export function createListing(data: Omit<Listing, 'id' | 'createdAt' | 'sold'>): Listing {
  const listing: Listing = {
    ...data,
    id: `l${_nextId++}`,
    createdAt: new Date().toISOString(),
    sold: false,
  };
  _listings = [listing, ..._listings];
  return listing;
}

export function markSold(id: string): void {
  _listings = _listings.map(l => l.id === id ? { ...l, sold: true } : l);
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
