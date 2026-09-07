-- ============================================================
-- Sequins — Seattle, WA Seed Data
-- Run once in Supabase Dashboard → SQL Editor
--
-- Creates:
--   • 10 Seattle drag performer profiles
--   • 12 upcoming events at real Seattle venues
--
-- Note: performer user_id is NULL (no auth account linked yet).
-- When a real performer claims their profile, update user_id
-- to their auth.users id.
-- ============================================================

-- ─── Performers ──────────────────────────────────────────────────────────────

INSERT INTO public.performers (
  id, stage_name, bio, booking_info, instagram_url, tiktok_url,
  commissions_enabled, commission_blurb, commission_pricing,
  created_at, updated_at
) VALUES

(
  'sea-perf-001',
  'Emerald LaReine',
  'Seattle''s undisputed queen of the Emerald City. Emerald LaReine has been ruling stages at Neighbours and beyond for over twelve years, earning a reputation for jaw-dropping couture looks inspired by the Pacific Northwest''s own moody, rain-soaked beauty. Her performances blend theatrical precision with genuine warmth — audiences leave feeling like they made a new best friend.',
  'Available for headline bookings, corporate Pride events, and keynote appearances. All looks are custom-designed. Please contact 8+ weeks out for full production numbers.',
  'https://instagram.com/emeraldlareine',
  NULL,
  true,
  'Custom gowns, PNW-inspired headpieces, and full drag transformation coaching.',
  'Makeup session: $90/hr · Gown commission: starting at $500 · Full look: starting at $750',
  NOW(), NOW()
),

(
  'sea-perf-002',
  'Rainy Day Rupaul',
  'Born in the drizzle, forged in neon. Rainy Day is Seattle''s most irreverent comedy queen — part roast master, part lip sync athlete, entirely herself. Known for soaking audiences in glitter during finales (literally) and for a TikTok series documenting her attempt to do drag in every Seattle neighborhood in a single weekend.',
  'Booking for bars, private events, and festivals. I travel up and down the I-5 corridor regularly. DM on Instagram.',
  'https://instagram.com/rainydaydrag',
  'https://tiktok.com/@rainydaydrag',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sea-perf-003',
  'Cassiopeia Voss',
  'Avant-garde meets Americana. Cassiopeia Voss is the drag artist Seattle''s art world talks about — her work has been featured in galleries, projection-mapped onto buildings during Pride week, and reviewed in The Stranger as "the most genuinely weird and wonderful thing happening on a stage in this city." She does not do brunches. She does do installations.',
  'Performance art bookings only. Requires full tech rider. Minimum 4 weeks notice. I take two shows per month — make your inquiry count.',
  'https://instagram.com/cassiopeiavoss',
  NULL,
  true,
  'Wearable sculpture, costume design for dance companies and film.',
  'Wearable art piece: starting at $600 · Collaborative design: contact for quote',
  NOW(), NOW()
),

(
  'sea-perf-004',
  'Maxine Voltage',
  'Drag king, electrician, and the hardest working performer in Seattle. Maxine Voltage brings a blue-collar swagger and a rock solid work ethic to every stage. A regular at Kremwerk''s king nights, she''s known for power tool reveals, construction-themed numbers, and a surprising tenderness in ballad performances that always catches people off guard.',
  'Open to all bookings across the greater Seattle area. Comfortable with outdoor festivals and unconventional venues. I bring my own PA.',
  'https://instagram.com/maxinevoltage',
  'https://tiktok.com/@maxinevoltageseattle',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sea-perf-005',
  'Duchess of Pike',
  'She is the market. Duchess of Pike is named for and deeply in love with Seattle''s Pike Place Market, and her performances reflect it — fish-toss reveals, produce-themed looks, and a number set to the sound of seagulls that somehow works perfectly. A beloved fixture of the Capitol Hill bar circuit for eight years.',
  'Brunch shows, happy hours, and neighborhood events are my specialty. Affordable rates for community events and nonprofit shows.',
  'https://instagram.com/duchessofpike',
  NULL,
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sea-perf-006',
  'Stormy Weatherby',
  'The forecast is always fabulous. Stormy is a meteorologist by training and a drag queen by calling, and she has built an entire show around weather — from tornado-themed reveal dresses to a breakup number performed under a functional rain machine. Resident performer at Julia''s on Broadway for four years running.',
  'Julia''s on Broadway shows are my home. Open to guest spots and festival bookings. I do require staging approval for the rain machine bit.',
  'https://instagram.com/stormyweatherby',
  NULL,
  true,
  'Weather-themed costume pieces and hand-painted rain gear.',
  'Custom umbrella art: $60–$120 · Rain-themed costume: starting at $300',
  NOW(), NOW()
),

(
  'sea-perf-007',
  'Kiki Cascades',
  'Fast feet, faster wit. Kiki Cascades is a classically trained ballet dancer who discovered drag at 26 and has never looked back. Her performances are athletic, precise, and often breathtaking — she holds the unofficial record for most costume changes in a single Neighbours set (seven). A fixture in the Seattle ballroom scene.',
  'Booking for shows, workshops, and special events. I also teach beginning and intermediate vogueing. Rate varies by event type.',
  'https://instagram.com/kikikascades',
  'https://tiktok.com/@kikikascades',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sea-perf-008',
  'Hendrix Holliday',
  'Where the blues meet the rhinestones. Hendrix Holliday is named for two legends and lives up to both. A drag king who performs original music as well as lip sync, Hendrix has released two EPs under the Holliday name and performs live guitar sets mid-drag-number — a double threat that Capitol Hill has fully claimed as its own.',
  'Available for concerts, listening rooms, and traditional drag nights. Live music bookings require 3+ weeks notice for sound coordination.',
  'https://instagram.com/hendrixhollidaymusic',
  NULL,
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sea-perf-009',
  'Pixie Rainier',
  'New to stages, native to stages. Pixie Rainier — named for the mountain that looms over Seattle like a watching giant — has been performing for just 18 months but brings a maturity and stage presence that feels like a decade. Weekly performer at R Place, where she has developed a devoted following who track her setlists obsessively.',
  'New to the booking market. Affordable rates, student-org discounts available. Student at UW — queer campus events especially welcome.',
  'https://instagram.com/pixierainierpdx',
  'https://tiktok.com/@pixierainier',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sea-perf-010',
  'Glory Hole-iday',
  'Christmas all year, chaos all night. Glory Hole-iday is Seattle''s most festive queen — she performs in holiday-themed looks regardless of the month, has a signature routine performed exclusively to Mariah Carey''s "All I Want for Christmas" that she does at least once per week, and throws wrapped candy into crowds during finales. People love it. They should.',
  'The party queen. Available for absolutely anything. No event too weird, no venue too small. Bring me in and I will bring the holiday.',
  'https://instagram.com/gloryholedragseattle',
  'https://tiktok.com/@gloryholdrag',
  false,
  NULL,
  NULL,
  NOW(), NOW()
)

ON CONFLICT (id) DO NOTHING;


-- ─── Events ──────────────────────────────────────────────────────────────────
-- host_id = '00000000-0000-0000-0000-000000000001' is a placeholder.
-- Replace with a real Supabase auth user ID after creating a host account.

INSERT INTO public.events (
  title, description,
  datetime_start, datetime_end, timezone,
  venue_name, venue_address, venue_city, venue_state, venue_zip, venue_instagram,
  ticket_price, host_id, host_name,
  performer_ids, is_recurring, recurring_frequency
) VALUES

-- Neighbours Nightclub
(
  'Friday Night at Neighbours',
  'The beating heart of Seattle drag. Neighbours Nightclub has been the crown jewel of Capitol Hill for decades, and Friday nights remain the city''s best drag showcase. Three acts, a packed floor, and the kind of energy that reminded a generation of queer people they weren''t alone. Emerald LaReine hosts.',
  (NOW() + INTERVAL '3 days')::text,
  (NOW() + INTERVAL '3 days' + INTERVAL '4 hours')::text,
  'America/Los_Angeles',
  'Neighbours Nightclub', '1509 Broadway', 'Seattle', 'WA', '98122', '@neighboursseattle',
  10, '00000000-0000-0000-0000-000000000001', 'Neighbours',
  ARRAY['sea-perf-001', 'sea-perf-007', 'sea-perf-010'],
  true, 'weekly'
),

(
  'Saturday Showdown at Neighbours',
  'The big one. Saturday nights at Neighbours are louder, longer, and more spectacular than anything else on Capitol Hill. Guest performers rotate weekly, the lighting rig is fully deployed, and the dancefloor doesn''t stop until close. This is what Seattle drag looks like at full power.',
  (NOW() + INTERVAL '4 days')::text,
  (NOW() + INTERVAL '4 days' + INTERVAL '4 hours')::text,
  'America/Los_Angeles',
  'Neighbours Nightclub', '1509 Broadway', 'Seattle', 'WA', '98122', '@neighboursseattle',
  15, '00000000-0000-0000-0000-000000000001', 'Neighbours',
  ARRAY['sea-perf-001', 'sea-perf-003', 'sea-perf-008'],
  true, 'weekly'
),

-- Julia's on Broadway
(
  'Brunch with the Queens',
  'Julia''s on Broadway has been Seattle''s premier drag brunch destination for years, and this is the show that launched a thousand bottomless mimosa traditions. Stormy Weatherby hosts a rotating cast of four performers while you eat. Whether you''re a first-timer or a regular, Julia''s brunch is a Seattle rite of passage.',
  (NOW() + INTERVAL '5 days')::text,
  (NOW() + INTERVAL '5 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'Julia''s on Broadway', '300 Broadway E', 'Seattle', 'WA', '98102', '@juliasonbroadway',
  40, '00000000-0000-0000-0000-000000000001', 'Julia''s on Broadway',
  ARRAY['sea-perf-006', 'sea-perf-005', 'sea-perf-009'],
  true, 'weekly'
),

(
  'Tuesday Tuck Night',
  'Julia''s midweek show is smaller, weirder, and somehow the most fun night of the week. Four queens, no script, and a crowd that''s there because they genuinely want to be. Kiki Cascades hosts. Tips are the whole economy here — bring cash.',
  (NOW() + INTERVAL '2 days')::text,
  (NOW() + INTERVAL '2 days' + INTERVAL '2 hours')::text,
  'America/Los_Angeles',
  'Julia''s on Broadway', '300 Broadway E', 'Seattle', 'WA', '98102', '@juliasonbroadway',
  0, '00000000-0000-0000-0000-000000000001', 'Julia''s on Broadway',
  ARRAY['sea-perf-007', 'sea-perf-002', 'sea-perf-010'],
  true, 'weekly'
),

-- Kremwerk
(
  'Kings of Capitol Hill',
  'Seattle''s monthly drag king showcase at Kremwerk, the underground club that''s been a home for the city''s weirdest and best queer performance for years. Maxine Voltage hosts a lineup of eight kings performing everything from grunge covers to boy band takedowns. This is the show drag kings built.',
  (NOW() + INTERVAL '12 days')::text,
  (NOW() + INTERVAL '12 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'Kremwerk', '1809 Minor Ave', 'Seattle', 'WA', '98101', '@kremwerkseattle',
  12, '00000000-0000-0000-0000-000000000001', 'Kings of Capitol Hill',
  ARRAY['sea-perf-004', 'sea-perf-008'],
  true, 'monthly'
),

(
  'Cassiopeia Voss: SIGNAL',
  'Kremwerk presents SIGNAL — a new 80-minute performance piece from Seattle''s most singular drag artist, Cassiopeia Voss. SIGNAL explores queer grief, cellular memory, and the frequency of joy. Projection mapping, live sound design, and a score composed for the show. Very limited capacity. This is drag as art.',
  (NOW() + INTERVAL '18 days')::text,
  (NOW() + INTERVAL '18 days' + INTERVAL '2 hours')::text,
  'America/Los_Angeles',
  'Kremwerk', '1809 Minor Ave', 'Seattle', 'WA', '98101', '@kremwerkseattle',
  28, '00000000-0000-0000-0000-000000000001', 'Cassiopeia Voss',
  ARRAY['sea-perf-003'],
  false, NULL
),

-- Queer/Bar
(
  'Queer/Bar Drag Night',
  'The neighborhood show. Queer/Bar on Capitol Hill is the kind of place where everybody knows your name — and your look. Weekly drag night runs Thursday through Saturday, with a rotating cast and the most welcoming crowd in the city. Performers range from veterans to first-timers, and audiences treat everyone like a star.',
  (NOW() + INTERVAL '6 days')::text,
  (NOW() + INTERVAL '6 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'Queer/Bar', '1518 11th Ave', 'Seattle', 'WA', '98122', '@queerbarseattle',
  5, '00000000-0000-0000-0000-000000000001', 'Queer/Bar',
  ARRAY['sea-perf-005', 'sea-perf-009', 'sea-perf-002'],
  true, 'weekly'
),

(
  'Pixie Rainier''s Debut Headline',
  'After 18 months of rising through Seattle''s ranks, Pixie Rainier headlines her first solo show at Queer/Bar. An all-new set, costumes she''s been working on for three months, and a supporting cast hand-picked from her Capitol Hill family. A night to remember from a performer the city is just starting to fully see.',
  (NOW() + INTERVAL '22 days')::text,
  (NOW() + INTERVAL '22 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'Queer/Bar', '1518 11th Ave', 'Seattle', 'WA', '98122', '@queerbarseattle',
  15, '00000000-0000-0000-0000-000000000001', 'Pixie Rainier',
  ARRAY['sea-perf-009', 'sea-perf-005', 'sea-perf-010'],
  false, NULL
),

-- The Cuff Complex
(
  'Leather & Lace Benefit Night',
  'A community benefit show at The Cuff, hosted by Rainy Day Rupaul, raising funds for the Lavender Rights Project. Six performers, a silent auction, and an energy that only comes from a crowd that cares about what they''re there for. All ticket proceeds go directly to LGBTQ+ legal advocacy in Washington state.',
  (NOW() + INTERVAL '15 days')::text,
  (NOW() + INTERVAL '15 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'The Cuff Complex', '1533 13th Ave', 'Seattle', 'WA', '98122', '@thecuffcomplex',
  20, '00000000-0000-0000-0000-000000000001', 'Rainy Day Rupaul',
  ARRAY['sea-perf-002', 'sea-perf-006', 'sea-perf-007', 'sea-perf-001'],
  false, NULL
),

(
  'Hendrix Holliday Live at the Cuff',
  'Drag meets live music. Hendrix Holliday brings her guitar, her sequins, and her band to The Cuff for a two-set evening of originals and reimagined classics. This is not a lip sync show — this is a concert, and one of the best you''ll see in Seattle this season.',
  (NOW() + INTERVAL '26 days')::text,
  (NOW() + INTERVAL '26 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'The Cuff Complex', '1533 13th Ave', 'Seattle', 'WA', '98122', '@thecuffcomplex',
  22, '00000000-0000-0000-0000-000000000001', 'Hendrix Holliday',
  ARRAY['sea-perf-008'],
  false, NULL
),

-- R Place
(
  'R Place Weekend Drag',
  'R Place Bar''s legendary weekend drag nights are the living room of Capitol Hill''s queer community. Low cover, strong pours, and a stage rotation that keeps things moving all night. Pixie Rainier and Glory Hole-iday trade sets from 10pm to close. No two nights are ever the same.',
  (NOW() + INTERVAL '8 days')::text,
  (NOW() + INTERVAL '8 days' + INTERVAL '4 hours')::text,
  'America/Los_Angeles',
  'R Place', '619 E Pine St', 'Seattle', 'WA', '98122', '@rplaceseattle',
  8, '00000000-0000-0000-0000-000000000001', 'R Place',
  ARRAY['sea-perf-009', 'sea-perf-010'],
  true, 'weekly'
),

-- Seattle Center / Pride special
(
  'Emerald City Pride Showcase',
  'Seattle Center hosts the annual Pride showcase featuring twelve of Seattle''s finest drag performers across two stages. Emerald LaReine headlines the main stage; Maxine Voltage leads the kings'' showcase on stage two. A celebration of the full spectrum of Seattle''s drag talent, free and open to all.',
  (NOW() + INTERVAL '30 days')::text,
  (NOW() + INTERVAL '30 days' + INTERVAL '5 hours')::text,
  'America/Los_Angeles',
  'Seattle Center Fisher Pavilion', '305 Harrison St', 'Seattle', 'WA', '98109', NULL,
  0, '00000000-0000-0000-0000-000000000001', 'Seattle Center',
  ARRAY['sea-perf-001', 'sea-perf-004', 'sea-perf-006', 'sea-perf-007', 'sea-perf-008', 'sea-perf-010'],
  false, NULL
)

;
