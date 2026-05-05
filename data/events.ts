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
  organizerVenmoHandle: string;
  imageUrl: string;
  performerIds: string[];
  tags?: string[];           // e.g. ['comedy', 'lip sync', 'pageant']
  isPromoted?: boolean;      // paid promoted placement — gold border + badge
};

export type Performer = {
  id: string;
  stageName: string;
  photoUrl: string;
  bio: string;
  venmoHandle: string;
  bookingInfo?: string;
  socials?: { instagram?: string; tiktok?: string; website?: string };
  commissionsEnabled?: boolean;
  commissionInfo?: { blurb?: string; samples?: string[]; pricingNotes?: string };
  isPromoted?: boolean;      // paid promoted placement — gold ring on avatar/card
};

export const performers: Performer[] = [
  {
    id: 'p1',
    stageName: 'Miss Nova Gold',
    photoUrl: 'https://picsum.photos/seed/nova/300/300',
    bio: 'High-energy pop + glam. Portland\'s reigning queen of the sequin.',
    venmoHandle: 'missnovagold',
    bookingInfo: 'Portland-based. Travel negotiable.',
    socials: { instagram: 'https://instagram.com/missnovagold' },
    commissionsEnabled: true,
    commissionInfo: { blurb: 'Custom wig styling + costumes', samples: [], pricingNotes: 'Wigs from $150+' },
    isPromoted: true,
  },
  {
    id: 'p2',
    stageName: 'DJ Velvet',
    photoUrl: 'https://picsum.photos/seed/velvet/300/300',
    bio: 'House, disco, vogue beats. Making dance floors dangerous since 2018.',
    venmoHandle: 'djvelvet',
  },
  {
    id: 'p3',
    stageName: 'Countess LaRoux',
    photoUrl: 'https://picsum.photos/seed/laroux/300/300',
    bio: 'Old Hollywood glamour meets downtown grit. Comedy, lip sync, and chaos.',
    venmoHandle: 'countesslaroux',
    bookingInfo: 'Seattle and PNW. Will travel for the right coin.',
    socials: { instagram: 'https://instagram.com/countesslaroux', tiktok: 'https://tiktok.com/@countesslaroux' },
    commissionsEnabled: true,
    commissionInfo: { blurb: 'Vintage-inspired gowns and headpieces', samples: [], pricingNotes: 'Starting at $200' },
  },
  {
    id: 'p4',
    stageName: 'Prism Bejeweled',
    photoUrl: 'https://picsum.photos/seed/prism/300/300',
    bio: 'Avant-garde looks and performance art. If it makes you think, it\'s working.',
    venmoHandle: 'prismbejeweled',
    bookingInfo: 'San Francisco based. Gallery shows and nightlife.',
    socials: { instagram: 'https://instagram.com/prismbejeweled', website: 'https://prismbejeweled.com' },
  },
  {
    id: 'p5',
    stageName: 'Honey Badger',
    photoUrl: 'https://picsum.photos/seed/honey/300/300',
    bio: 'Comedy drag. Absolutely unhinged. You\'ve been warned.',
    venmoHandle: 'honeybadgerdrag',
    bookingInfo: 'Chicago. Takes no prisoners.',
    socials: { instagram: 'https://instagram.com/honeybadgerdrag' },
  },
  {
    id: 'p6',
    stageName: 'Valentina Vex',
    photoUrl: 'https://picsum.photos/seed/vex/300/300',
    bio: 'Ballroom legend. Vogue, runway, realness.',
    venmoHandle: 'valentinavex',
    bookingInfo: 'New York City. Nationwide bookings.',
    socials: { instagram: 'https://instagram.com/valentinavex', tiktok: 'https://tiktok.com/@valentinavex' },
  },
];

// Helper: offset days from now
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const events: Event[] = [
  {
    id: 'e1',
    title: 'Queens of the Night',
    description: 'A fierce lineup of local talent takes over The Gilded Lily for one night only. Expect lip sync battles, comedy, and plenty of sequins.',
    dateTimeStart: days(1),
    venueName: 'The Gilded Lily',
    venueAddress: '123 Pride Ave',
    city: 'Portland, OR',
    price: 15,
    capacity: 120,
    organizerVenmoHandle: 'dragboutique',
    imageUrl: 'https://picsum.photos/seed/event1/1200/800',
    performerIds: ['p1', 'p2'],
    tags: ['lip sync', 'comedy'],
    isPromoted: true,
  },
  {
    id: 'e2',
    title: 'Glitter & Gore: Halloween Extravaganza',
    description: 'The annual Halloween drag spectacular. Costumes required, judgment suspended. Miss Nova Gold headlines with a cast of 8 local queens.',
    dateTimeStart: days(3),
    venueName: 'The Velvet Underground',
    venueAddress: '456 Burnside St',
    city: 'Portland, OR',
    price: 25,
    capacity: 200,
    organizerVenmoHandle: 'velvetpdx',
    imageUrl: 'https://picsum.photos/seed/event2/1200/800',
    performerIds: ['p1'],
    tags: ['halloween', 'pageant'],
  },
  {
    id: 'e3',
    title: 'Countess LaRoux: One Night Stand',
    description: 'An intimate one-woman show from Seattle\'s most unhinged queen. Storytelling, comedy, and a finale that nobody sees coming.',
    dateTimeStart: days(5),
    venueName: 'Re-bar',
    venueAddress: '1114 Howell St',
    city: 'Seattle, WA',
    price: 20,
    capacity: 80,
    organizerVenmoHandle: 'rebarseattle',
    imageUrl: 'https://picsum.photos/seed/event3/1200/800',
    performerIds: ['p3'],
    tags: ['comedy', 'storytelling'],
  },
  {
    id: 'e4',
    title: 'Vogue Nights Vol. 12',
    description: 'The monthly ballroom event returns. Categories include Femme Queen Realness, Butch Queen Vogue Performance, and Best Dressed. $500 prize pool.',
    dateTimeStart: days(7),
    venueName: 'Neighbours Nightclub',
    venueAddress: '1509 Broadway',
    city: 'Seattle, WA',
    price: 10,
    capacity: 300,
    organizerVenmoHandle: 'voguenightsseattle',
    imageUrl: 'https://picsum.photos/seed/event4/1200/800',
    performerIds: ['p3', 'p6'],
    tags: ['ballroom', 'vogue', 'competition'],
  },
  {
    id: 'e5',
    title: 'Prism Presents: After Dark',
    description: 'A multi-sensory drag art installation and performance. Prism Bejeweled curates an evening of avant-garde looks and live performance art.',
    dateTimeStart: days(9),
    venueName: 'The Eagle SF',
    venueAddress: '398 12th St',
    city: 'San Francisco, CA',
    price: 30,
    capacity: 150,
    organizerVenmoHandle: 'eaglesf',
    imageUrl: 'https://picsum.photos/seed/event5/1200/800',
    performerIds: ['p4'],
    tags: ['art', 'performance art'],
  },
  {
    id: 'e6',
    title: 'Brunch with the Queens',
    description: 'Bottomless mimosas. Drag performances between courses. Tips mandatory, sass complimentary. Seating is limited — book early.',
    dateTimeStart: days(10),
    venueName: 'Beaux',
    venueAddress: '2344 Market St',
    city: 'San Francisco, CA',
    price: 45,
    capacity: 60,
    organizerVenmoHandle: 'beauxsf',
    imageUrl: 'https://picsum.photos/seed/event6/1200/800',
    performerIds: ['p4'],
    tags: ['brunch', 'dining'],
  },
  {
    id: 'e7',
    title: 'Honey Badger: Absolutely Unhinged Tour',
    description: 'Chicago\'s wildest comedy drag queen brings her solo show to the road. No topic is off limits. Front row at your own risk.',
    dateTimeStart: days(12),
    venueName: 'Berlin Nightclub',
    venueAddress: '954 W Belmont Ave',
    city: 'Chicago, IL',
    price: 18,
    capacity: 175,
    organizerVenmoHandle: 'berlinchi',
    imageUrl: 'https://picsum.photos/seed/event7/1200/800',
    performerIds: ['p5'],
    tags: ['comedy', 'tour'],
  },
  {
    id: 'e8',
    title: 'Realness NYC: Grand Prix',
    description: 'The biggest ballroom event of the season. Five categories, judges flown in from LA and Chicago, and a $2,000 grand prize. Legends will be made.',
    dateTimeStart: days(14),
    venueName: 'Playhouse NYC',
    venueAddress: '139 W 16th St',
    city: 'New York, NY',
    price: 35,
    capacity: 500,
    organizerVenmoHandle: 'realnessnyc',
    imageUrl: 'https://picsum.photos/seed/event8/1200/800',
    performerIds: ['p6'],
    tags: ['ballroom', 'vogue', 'competition'],
  },
  {
    id: 'e9',
    title: 'Free the Queens: Benefit Show',
    description: 'All proceeds go to the Portland LGBTQ+ Community Center. Six queens, two hours, zero cover charge. Donations gratefully accepted at the door.',
    dateTimeStart: days(16),
    venueName: 'Revolution Hall',
    venueAddress: '1300 SE Stark St',
    city: 'Portland, OR',
    price: 0,
    capacity: 400,
    organizerVenmoHandle: 'portlandlgbtqcenter',
    imageUrl: 'https://picsum.photos/seed/event9/1200/800',
    performerIds: ['p1', 'p2', 'p3'],
    tags: ['benefit', 'community'],
  },
  {
    id: 'e10',
    title: 'Valentina Vex: The Farewell Tour',
    description: 'After 12 years on the scene, Valentina Vex takes her final bow. A career-spanning show with special guests, a live band, and a crowd that refuses to let her go.',
    dateTimeStart: days(21),
    venueName: 'Music Box Chicago',
    venueAddress: '3733 N Southport Ave',
    city: 'Chicago, IL',
    price: 55,
    capacity: 750,
    organizerVenmoHandle: 'musicboxchi',
    imageUrl: 'https://picsum.photos/seed/event10/1200/800',
    performerIds: ['p5', 'p6'],
    tags: ['farewell', 'live band'],
  },
];
