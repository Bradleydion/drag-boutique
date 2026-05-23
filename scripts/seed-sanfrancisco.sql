-- ============================================================
-- Sequins — San Francisco, CA Seed Data
-- Run once in Supabase Dashboard → SQL Editor
--
-- Creates:
--   • 10 San Francisco drag performer profiles
--   • 12 upcoming events at real SF venues
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
  'sf-perf-001',
  'Valencia Vermillion',
  'The Mission''s queen and the Bay''s best kept secret — though the secret''s out. Valencia Vermillion has been performing at Oasis, The Edge, and every bar worth mentioning on 18th Street for eleven years, earning a reputation for looks that blur the line between fashion and performance art. Trained in couture construction at FIDM; every stitch of every look is her own.',
  'Available for headline bookings and fashion-adjacent events. Requires 6+ weeks for full custom looks. Corporate Pride bookings welcome — rate sheet on request.',
  'https://instagram.com/valenciavermillion',
  NULL,
  true,
  'Couture construction, wearable art, and editorial costume commissions.',
  'Custom corset: starting at $450 · Full editorial look: starting at $800 · Fashion collab: contact for quote',
  NOW(), NOW()
),

(
  'sf-perf-002',
  'Folsom Fondue',
  'Leather daddy energy in a sequin dress. Folsom Fondue is a love letter to San Francisco''s leather and kink heritage wrapped in rhinestones — her looks reference the Folsom Street Fair, her numbers are genuinely filthy in the best possible way, and she has made more people fall in love with drag than anyone working in the Bay today. A Beaux regular and SoMa legend.',
  'Folsom books bars, leather events, and Pride activations. No corporate bookings. I keep rates accessible for queer-owned venues.',
  'https://instagram.com/folsomfondue',
  'https://tiktok.com/@folsomfonduesf',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sf-perf-003',
  'Earthquake Weather',
  'San Francisco through and through. Earthquake Weather performs with the nervous energy of a city built on fault lines — unpredictable, electric, and occasionally earth-shaking. Her numbers are conceptual, often featuring live monologue woven into lip sync, and she has a devoted following in the Castro that shows up for every single show.',
  'Primarily performs in the Castro and SoMa. Guest bookings considered on a case-by-case basis. DM for inquiry.',
  'https://instagram.com/earthquakeweathersf',
  NULL,
  true,
  'Sculptural headwear and surrealist accessories.',
  'Statement headpiece: starting at $200 · Full sculptural look: starting at $600',
  NOW(), NOW()
),

(
  'sf-perf-004',
  'King Sourdough',
  'SF''s favorite drag king, and yes, the name is intentional. King Sourdough leans all the way into the bit — his looks are dough-themed, his merch sells out at every show, and he once performed an entire number using a baguette as a prop. Beneath the bit is one of the Bay''s sharpest performers: technically flawless, genuinely funny, and deeply loved.',
  'Available for all events. Workshop facilitator for drag king beginners. Bread-themed content is non-negotiable.',
  'https://instagram.com/kingsourdoughsf',
  'https://tiktok.com/@kingsourdoughsf',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sf-perf-005',
  'Madame de la Haight',
  'Ashbury Heights has a queen, and she has been reigning since 2015. Madame de la Haight channels classic 1960s San Francisco — her looks reference the Summer of Love, her music is vintage psychedelic rock reimagined as drag bangers, and her monthly residency at The Edge draws a crowd that spans every generation of SF queer history.',
  'Residency at The Edge every third Saturday. Open to guest bookings and private events. Rates are reasonable; queer nonprofits receive a discount.',
  'https://instagram.com/madamedelahaight',
  NULL,
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sf-perf-006',
  'Bianca de la Fog',
  'Named for San Francisco''s famously moody marine layer, Bianca de la Fog brings slow-burn drama and devastating lip sync precision to every stage. Her signature: starting every number at the back of the room and working her way forward, one devastating step at a time. Oasis headliner, LGBTQ+ arts council board member, and all-around industry pillar.',
  'Headline bookings only at this stage of her career. Submit a proper inquiry — she reads them all personally. Minimum 8 weeks advance notice.',
  'https://instagram.com/biancadelafog',
  NULL,
  true,
  'Fog-inspired textile work and hand-painted performance wear.',
  'Custom textile piece: starting at $350 · Full performance costume: starting at $700',
  NOW(), NOW()
),

(
  'sf-perf-007',
  'Noe Valentino',
  'Noe Valley''s drag sweetheart. Noe Valentino brings warmth and technical precision to every performance — trained in musical theater at SF State, she lip syncs with an actor''s attention to meaning, not just movement. Weekly performer at Beaux, and the host of "Drag Therapy," a monthly storytelling show where performers share real stories between numbers.',
  'Open to all bookings. Host and facilitator for storytelling events. Mental health advocates get discounted rates — please ask.',
  'https://instagram.com/noevalentinosf',
  'https://tiktok.com/@noevalsf',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sf-perf-008',
  'The Tenderloin Duchess',
  'Working class and proud. The Tenderloin Duchess performs in the neighborhood she lives in and makes no apologies for it. Her shows are raw, funny, political, and real — she has performed benefit shows for every housing justice org in the city, and she would rather perform for $50 at a community meeting than $500 at a tech company''s Pride party.',
  'Community events and benefits always at reduced rates. Available for bar bookings when my schedule allows. I do not do corporate Pride.',
  'https://instagram.com/tenderloinduchess',
  NULL,
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sf-perf-009',
  'Glitter Guzman',
  'Two years in and absolutely unstoppable. Glitter Guzman is Mission-raised, CCSF-educated, and performing with the confidence of someone who''s been doing this for decades. Known for high-energy numbers that somehow leave the audience simultaneously exhausted and energized. A Club OMG regular who has been selling out their Thursday slot for six months straight.',
  'New to formal booking but very available. Bilingual (English/Spanish) — especially love performing for Latinx LGBTQ+ events. No event too small.',
  'https://instagram.com/glitterguzman',
  'https://tiktok.com/@glitterguzman',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'sf-perf-010',
  'Prima Donna Jones',
  'The opera queen. Prima Donna Jones came to drag via a decade of classical vocal training and brings a performer''s discipline and a diva''s confidence to everything she touches. Her signature move: performing a full operatic phrase live, mid-lip-sync number, without breaking character. She has made audiences cry with joy more times than she can count.',
  'Selective bookings for shows that match her artistry. Performs live voice two to three times per show — venues must have appropriate sound.',
  'https://instagram.com/primadonnajonessf',
  NULL,
  true,
  'Custom opera-inspired gowns and performance costume design.',
  'Custom gown: starting at $550 · Full opera look with accessories: starting at $900',
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

-- Oasis
(
  'Friday Night Oasis',
  'Oasis is the crown jewel of San Francisco drag — a proper theater with a proper stage, incredible lighting, and a curatorial eye for booking that has made it the city''s most important venue for queer performance. Friday nights are the flagship: two acts, a DJ set between, and a lineup assembled by a team that genuinely loves what they do. Bianca de la Fog headlines.',
  (NOW() + INTERVAL '3 days')::text,
  (NOW() + INTERVAL '3 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'Oasis', '298 11th St', 'San Francisco', 'CA', '94103', '@oasissf',
  25, '00000000-0000-0000-0000-000000000001', 'Oasis',
  ARRAY['sf-perf-006', 'sf-perf-001', 'sf-perf-010'],
  true, 'weekly'
),

(
  'Valencia Vermillion: COUTURE',
  'A one-night-only fashion showcase at Oasis. Valencia Vermillion presents COUTURE — eight performers, each wearing a look commissioned from a Bay Area LGBTQ+ designer, performing numbers that match the aesthetic of each piece. Part drag show, part runway, all San Francisco.',
  (NOW() + INTERVAL '14 days')::text,
  (NOW() + INTERVAL '14 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'Oasis', '298 11th St', 'San Francisco', 'CA', '94103', '@oasissf',
  35, '00000000-0000-0000-0000-000000000001', 'Valencia Vermillion',
  ARRAY['sf-perf-001', 'sf-perf-003', 'sf-perf-006', 'sf-perf-010'],
  false, NULL
),

-- Beaux
(
  'Beaux Sunday Drag Brunch',
  'Castro brunch royalty. Beaux has been doing Sunday drag brunch longer than most of its brunch guests have been out of the closet, and the formula is simple and perfect: great cocktails, a three-course menu, and four queens who will entertain, embarrass, and delight you in equal measure. Noe Valentino hosts.',
  (NOW() + INTERVAL '5 days')::text,
  (NOW() + INTERVAL '5 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'Beaux', '2344 Market St', 'San Francisco', 'CA', '94114', '@beauxsf',
  45, '00000000-0000-0000-0000-000000000001', 'Beaux',
  ARRAY['sf-perf-007', 'sf-perf-002', 'sf-perf-009'],
  true, 'weekly'
),

(
  'Thursday Night at Beaux',
  'Beaux''s Thursday show is the Castro''s weekly ritual. Lower cover, same incredible performances, the kind of crowd that shows up because they love drag — not because it''s a bachelorette party. Glitter Guzman is on a six-month hot streak here and she shows no signs of cooling off.',
  (NOW() + INTERVAL '2 days')::text,
  (NOW() + INTERVAL '2 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'Beaux', '2344 Market St', 'San Francisco', 'CA', '94114', '@beauxsf',
  10, '00000000-0000-0000-0000-000000000001', 'Beaux',
  ARRAY['sf-perf-009', 'sf-perf-007', 'sf-perf-004'],
  true, 'weekly'
),

-- The Edge
(
  'Madame de la Haight: The Third Saturday',
  'The residency San Francisco has adopted as its own. Madame de la Haight''s monthly third-Saturday show at The Edge blends 1960s psychedelia with contemporary drag in a format that draws regulars from every neighborhood in the city. Three supporting performers, a vintage-sourced light show, and set design that transforms the room.',
  (NOW() + INTERVAL '18 days')::text,
  (NOW() + INTERVAL '18 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'The Edge', '4149 18th St', 'San Francisco', 'CA', '94114', '@theedgesf',
  18, '00000000-0000-0000-0000-000000000001', 'The Edge',
  ARRAY['sf-perf-005', 'sf-perf-003', 'sf-perf-007'],
  true, 'monthly'
),

(
  'Drag Therapy: Stories from the Stage',
  'Noe Valentino''s storytelling show returns to The Edge. Six performers share real stories — funny, devastating, mundane, extraordinary — between numbers that respond to what was just said. A night that reminds audiences why drag is not just entertainment: it is a technology for surviving.',
  (NOW() + INTERVAL '25 days')::text,
  (NOW() + INTERVAL '25 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'The Edge', '4149 18th St', 'San Francisco', 'CA', '94114', '@theedgesf',
  20, '00000000-0000-0000-0000-000000000001', 'Noe Valentino',
  ARRAY['sf-perf-007', 'sf-perf-008', 'sf-perf-003', 'sf-perf-010'],
  true, 'monthly'
),

-- Club OMG
(
  'OMG Wednesday Drag',
  'The most accessible night in SoMa. Club OMG on 6th Street has one of the lowest covers and the highest energy of any venue in the city. Wednesday nights are hosted by rotating performers who bring out their most adventurous sets — the crowd here is forgiving, enthusiastic, and very willing to tip.',
  (NOW() + INTERVAL '6 days')::text,
  (NOW() + INTERVAL '6 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'Club OMG', '43 6th St', 'San Francisco', 'CA', '94103', '@clubomgsf',
  5, '00000000-0000-0000-0000-000000000001', 'Club OMG',
  ARRAY['sf-perf-009', 'sf-perf-002', 'sf-perf-004'],
  true, 'weekly'
),

(
  'Kings of SoMa',
  'Club OMG''s monthly drag king showcase is the fastest growing show in the South of Market scene. King Sourdough and four other kings hold down a two-hour set of lip sync, live music, and crowd work that ends in a foam party. Yes, a foam party. Yes, it works.',
  (NOW() + INTERVAL '20 days')::text,
  (NOW() + INTERVAL '20 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'Club OMG', '43 6th St', 'San Francisco', 'CA', '94103', '@clubomgsf',
  12, '00000000-0000-0000-0000-000000000001', 'Club OMG',
  ARRAY['sf-perf-004', 'sf-perf-008'],
  true, 'monthly'
),

-- EndUp
(
  'The Tenderloin Duchess Community Benefit',
  'A benefit show for the Tenderloin Neighborhood Development Corporation at the EndUp, produced entirely by the Tenderloin Duchess and volunteer performers. No corporate sponsors. No tech company logos. Just San Francisco queer community doing what it has always done: taking care of its own.',
  (NOW() + INTERVAL '16 days')::text,
  (NOW() + INTERVAL '16 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'EndUp', '401 6th St', 'San Francisco', 'CA', '94103', '@endupSF',
  15, '00000000-0000-0000-0000-000000000001', 'The Tenderloin Duchess',
  ARRAY['sf-perf-008', 'sf-perf-009', 'sf-perf-002', 'sf-perf-007'],
  false, NULL
),

(
  'Earthquake Weather: FAULT LINES',
  'The EndUp becomes a theater for one night. Earthquake Weather''s FAULT LINES is a 75-minute performance work exploring gentrification, displacement, and queer joy in a city that is always changing and somehow always here. Part drag show, part memorial, part love letter. Expect live poetry, video installation, and at least one extraordinary reveal.',
  (NOW() + INTERVAL '28 days')::text,
  (NOW() + INTERVAL '28 days' + INTERVAL '2 hours')::text,
  'America/Los_Angeles',
  'EndUp', '401 6th St', 'San Francisco', 'CA', '94103', '@endupSF',
  24, '00000000-0000-0000-0000-000000000001', 'Earthquake Weather',
  ARRAY['sf-perf-003'],
  false, NULL
),

-- F8
(
  'Folsom After-Party Drag',
  'The official Folsom Street Fair after-party drag showcase at F8. Folsom Fondue hosts the night that celebrates the intersection of leather, kink, and drag with the reverence it deserves. Eight performers, a leather-themed runway, and a crowd that has seen everything and appreciates seeing it done this well.',
  (NOW() + INTERVAL '9 days')::text,
  (NOW() + INTERVAL '9 days' + INTERVAL '4 hours')::text,
  'America/Los_Angeles',
  'F8', '1192 Folsom St', 'San Francisco', 'CA', '94103', '@f8sf',
  20, '00000000-0000-0000-0000-000000000001', 'Folsom Fondue',
  ARRAY['sf-perf-002', 'sf-perf-001', 'sf-perf-006'],
  false, NULL
),

-- Davies Symphony Hall / Pride special
(
  'Prima Donna Jones: An Evening at the Hall',
  'In a city that invented the crossover between high art and queer performance, Prima Donna Jones brings drag to Davies Symphony Hall for one singular evening. A 90-minute show blending live voice, lip sync, and a chamber ensemble arranged for the occasion. The show San Francisco didn''t know it needed until now.',
  (NOW() + INTERVAL '32 days')::text,
  (NOW() + INTERVAL '32 days' + INTERVAL '2 hours')::text,
  'America/Los_Angeles',
  'Davies Symphony Hall', '201 Van Ness Ave', 'San Francisco', 'CA', '94102', NULL,
  55, '00000000-0000-0000-0000-000000000001', 'Prima Donna Jones',
  ARRAY['sf-perf-010', 'sf-perf-001', 'sf-perf-006'],
  false, NULL
)

;
