export type Event = {
  id: string;
  title: string;
  description: string;
  dateTimeStart: string;     // ISO
  venueName: string;
  venueAddress: string;
  city: string;
  price: number;
  capacity: number;
  organizerVenmoHandle: string; // e.g., "dragboutique"
  imageUrl: string;
  performerIds: string[];
};

export type Performer = {
  id: string;
  stageName: string;
  photoUrl: string;
  bio: string;
  venmoHandle: string; // "queenname"
  bookingInfo?: string;
  socials?: { instagram?: string; tiktok?: string; website?: string };
  commissionsEnabled?: boolean;
  commissionInfo?: { blurb?: string; samples?: string[]; pricingNotes?: string };
};

export const performers: Performer[] = [
  {
    id: 'p1',
    stageName: 'Miss Nova Gold',
    photoUrl: 'https://picsum.photos/seed/nova/300/300',
    bio: 'High-energy pop + glam.',
    venmoHandle: 'missnovagold',
    bookingInfo: 'Portland-based. Travel negotiable.',
    socials: { instagram: 'https://instagram.com/missnovagold' },
    commissionsEnabled: true,
    commissionInfo: { blurb: 'Custom wig styling + costumes', samples: [], pricingNotes: 'Wigs from $150+' },
  },
  {
    id: 'p2',
    stageName: 'DJ Velvet',
    photoUrl: 'https://picsum.photos/seed/velvet/300/300',
    bio: 'House, disco, vogue beats.',
    venmoHandle: 'djvelvet',
  },
];

export const events: Event[] = [
  {
    id: 'e1',
    title: 'Queens of the Night',
    description: 'A fierce lineup of local talent.',
    dateTimeStart: new Date(Date.now() + 86400000).toISOString(),
    venueName: 'The Gilded Lily',
    venueAddress: '123 Pride Ave',
    city: 'Portland, OR',
    price: 15,
    capacity: 120,
    organizerVenmoHandle: 'dragboutique',
    imageUrl: 'https://picsum.photos/seed/event1/1200/800',
    performerIds: ['p1', 'p2'],
  },
];