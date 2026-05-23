-- ============================================================
-- Sequins — Portland, OR Seed Data
-- Run once in Supabase Dashboard → SQL Editor
--
-- Creates:
--   • 10 Portland drag performer profiles
--   • 12 upcoming events at real Portland venues
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
  'pdx-perf-001',
  'Vivienne LaVore',
  'Portland''s reigning queen of high camp and couture chaos. Vivienne has been gracing stages across the Pacific Northwest for over a decade, known for her jaw-dropping reveals and lip syncs that leave audiences shook. Off stage she designs her own costumes and teaches drag makeup workshops.',
  'Available for events, private parties, and corporate pride events. Please reach out 6+ weeks in advance for full looks.',
  'https://instagram.com/viviennelavore',
  NULL,
  true,
  'Custom drag looks, costume commissions, and makeup coaching.',
  'Makeup consult: $75/hr · Full look commission: starting at $400 · Custom corset: starting at $600',
  NOW(), NOW()
),

(
  'pdx-perf-002',
  'Roxanne Riot',
  'Punk rock princess meets old-Hollywood glamour. Roxanne Riot burst onto the Portland scene in 2019 and hasn''t stopped since. Known for high-energy performances, crowd work, and a signature electric blue wig that''s become iconic in the Rose City.',
  'Roxanne books shows, bachelorette events, and pride activations. DM on Instagram or use the booking form.',
  'https://instagram.com/roxanneriotpdx',
  'https://tiktok.com/@roxanneriot',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'pdx-perf-003',
  'Celestia Moon',
  'Celestia brings celestial fantasy to every stage. A Portland native and OHSU nurse by day, drag queen by night. Celestia''s ethereal looks and emotional ballad performances have earned her a devoted following. She also runs the monthly "Drag 101" workshop series for aspiring performers.',
  'Available for bookings, workshops, and mentorship. Trans and BIPOC performers always welcomed in my shows.',
  'https://instagram.com/celestiamoonpdx',
  NULL,
  true,
  'Headpieces, fantasy accessories, and celestial-themed costumes.',
  'Headpiece: starting at $150 · Bodysuit: starting at $350 · Full fantasy look: starting at $700',
  NOW(), NOW()
),

(
  'pdx-perf-004',
  'Diesel McQueen',
  'Portland''s favorite gender-bending king. Diesel blends country swagger with queer punk energy in performances that feel like a fever dream at a honky-tonk bar. Regular performer at Crush and CC''s, Diesel has opened for national touring acts and hosts the monthly Kings of PDX showcase.',
  'Open to bookings across the Pacific Northwest. Available for teaching lip sync and drag king workshops.',
  'https://instagram.com/dieselmcqueen',
  'https://tiktok.com/@dieselmcqueenpdx',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'pdx-perf-005',
  'Pearl Clutcher',
  'Serving grandmother realness with a twist. Pearl Clutcher is Portland''s beloved comedy queen, known for roasting audiences with love and performing numbers that range from Dolly Parton to Lizzo without missing a beat. A staple of the Portland brunch scene for 7 years running.',
  'Brunch shows, corporate events, and birthday parties are my specialty. I play well with others and always come prepared.',
  'https://instagram.com/pearlclutcherpdx',
  NULL,
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'pdx-perf-006',
  'Midnight Soleil',
  'Dark fantasy meets avant-garde dance. Midnight Soleil trained in contemporary dance at PSU before discovering drag and never looked back. Her performances are theatrical, often silent, always haunting. Featured in Portland Monthly''s "Faces of PDX Pride" two years running.',
  'Performance art bookings, gallery events, and pride festivals. I require a proper tech rider — lighting matters.',
  'https://instagram.com/midnightsoleilpdx',
  NULL,
  true,
  'Sculptural wearable art and avant-garde costume pieces.',
  'Wearable sculpture: starting at $500 · Collaborative art piece: let''s talk',
  NOW(), NOW()
),

(
  'pdx-perf-007',
  'Ginger Snapped',
  'Comedy, chaos, and impeccable timing. Ginger Snapped started doing drag on a dare at Scandals in 2017 and accidentally became one of Portland''s most booked queens. Her signature move — snapping back at hecklers in rhyme — has gone viral twice.',
  'Always looking for fun shows and weird gigs. I bring my own sound equipment and I never lip sync to the wrong version.',
  'https://instagram.com/gingersnappedpdx',
  'https://tiktok.com/@gingersnapped',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'pdx-perf-008',
  'Aurora Borealis',
  'Pacific Northwest''s own northern lights. Aurora specializes in massive production numbers with elaborate lighting cues and costume reveals. She produces her own shows under the "Aurora Presents" banner and has sold out Holocene three times this year.',
  'Booking for headline and feature spots only. Producer inquiries welcome — I co-produce events regularly.',
  'https://instagram.com/auroraborealispdx',
  NULL,
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'pdx-perf-009',
  'Tuck N. Roll',
  'Fast, funny, and fearless. Tuck N. Roll is the Portland drag scene''s rising star — performing for just two years but already a crowd favorite at CC Slaughters'' weekly shows. Known for stunts, crowd dives, and once performing an entire number in roller skates.',
  'New to the booking scene but ready for anything. Student rates available for queer student organizations.',
  'https://instagram.com/tucknrollpdx',
  'https://tiktok.com/@tucknroll',
  false,
  NULL,
  NULL,
  NOW(), NOW()
),

(
  'pdx-perf-010',
  'Lavender Haze',
  'Soft, ethereal, and unexpectedly powerful. Lavender performs slow-burn emotional numbers that build to moments audiences talk about for weeks. A mental health advocate who frequently performs benefit shows for LGBTQ+ youth organizations in Portland.',
  'Passionate about benefit shows and community events. Sliding scale rates available for nonprofits.',
  'https://instagram.com/lavenderhaze.pdx',
  NULL,
  true,
  'Floral crowns, soft fantasy accessories, and hand-painted silk pieces.',
  'Floral crown: $80–$200 · Painted silk: starting at $120 · Custom piece: DM to discuss',
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

-- Darcelle XV
(
  'Friday Night Fabulosa',
  'Portland''s longest-running drag show returns every Friday night at the legendary Darcelle XV Showplace. Three acts, a rotating cast of Portland''s finest queens, and more sequins than you can count. Cocktails, cabaret, and community — this is the show that started it all.',
  (NOW() + INTERVAL '3 days')::text,
  (NOW() + INTERVAL '3 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'Darcelle XV Showplace', '208 NW 3rd Ave', 'Portland', 'OR', '97209', '@darcellexv',
  20, '00000000-0000-0000-0000-000000000001', 'Darcelle XV',
  ARRAY['pdx-perf-001', 'pdx-perf-005', 'pdx-perf-007'],
  true, 'weekly'
),

(
  'Saturday Spectacular',
  'The Saturday show at Darcelle XV is longer, louder, and even more fabulous than Friday. Expect special guests, bigger production numbers, and the full Darcelle experience. Dinner seating available — reserve early.',
  (NOW() + INTERVAL '4 days')::text,
  (NOW() + INTERVAL '4 days' + INTERVAL '3 hours 30 minutes')::text,
  'America/Los_Angeles',
  'Darcelle XV Showplace', '208 NW 3rd Ave', 'Portland', 'OR', '97209', '@darcellexv',
  25, '00000000-0000-0000-0000-000000000001', 'Darcelle XV',
  ARRAY['pdx-perf-001', 'pdx-perf-003', 'pdx-perf-006', 'pdx-perf-008'],
  true, 'weekly'
),

-- CC Slaughters
(
  'Drag Me to Brunch',
  'Portland''s most beloved Sunday drag brunch is back at CC Slaughters. Three courses, bottomless mimosas, and four queens who will absolutely judge your outfit (lovingly). Hosted by the incomparable Pearl Clutcher, this is the brunch your mom warned you about.',
  (NOW() + INTERVAL '5 days')::text,
  (NOW() + INTERVAL '5 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'CC Slaughters', '219 NW Davis St', 'Portland', 'OR', '97209', '@ccslaughterspdx',
  45, '00000000-0000-0000-0000-000000000001', 'CC Slaughters',
  ARRAY['pdx-perf-005', 'pdx-perf-007', 'pdx-perf-009'],
  true, 'weekly'
),

(
  'Wednesday Night Queens',
  'Midweek drag at CC Slaughters — because why should the weekend have all the fun? A rotating cast of Portland queens performs from 9pm until close. No cover before 9:30, $5 after. Tips make the world go round.',
  (NOW() + INTERVAL '6 days')::text,
  (NOW() + INTERVAL '6 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'CC Slaughters', '219 NW Davis St', 'Portland', 'OR', '97209', '@ccslaughterspdx',
  5, '00000000-0000-0000-0000-000000000001', 'CC Slaughters',
  ARRAY['pdx-perf-002', 'pdx-perf-009', 'pdx-perf-010'],
  true, 'weekly'
),

-- Holocene
(
  'Aurora Presents: SUPERNOVA',
  'Aurora Borealis brings her biggest production yet to Holocene. SUPERNOVA is a 90-minute theatrical drag experience — part concert, part performance art, all spectacle. Featuring a live DJ, custom lighting design, and a supporting cast of six Portland queens. This one sells out. Get your ticket.',
  (NOW() + INTERVAL '10 days')::text,
  (NOW() + INTERVAL '10 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'Holocene', '1001 SE Morrison St', 'Portland', 'OR', '97214', '@holocenepdx',
  30, '00000000-0000-0000-0000-000000000001', 'Aurora Borealis',
  ARRAY['pdx-perf-008', 'pdx-perf-001', 'pdx-perf-003', 'pdx-perf-006', 'pdx-perf-010'],
  false, NULL
),

(
  'Kings of PDX Monthly',
  'Portland''s premiere drag king showcase returns to Holocene. Hosted by Diesel McQueen, featuring eight kings performing everything from outlaw country to hyperpop. An all-ages show that proves drag kings are just as iconic. Standing room only — arrive early.',
  (NOW() + INTERVAL '14 days')::text,
  (NOW() + INTERVAL '14 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'Holocene', '1001 SE Morrison St', 'Portland', 'OR', '97214', '@holocenepdx',
  15, '00000000-0000-0000-0000-000000000001', 'Kings of PDX',
  ARRAY['pdx-perf-004'],
  true, 'monthly'
),

-- Crush Bar
(
  'Femme Fatale Fridays',
  'Crush Bar''s weekly celebration of femme, queer, and non-binary excellence. Three performers, a packed dancefloor, and the most inclusive crowd in Portland. Roxanne Riot hosts — expect to be called out lovingly and leave with new friends.',
  (NOW() + INTERVAL '7 days')::text,
  (NOW() + INTERVAL '7 days' + INTERVAL '4 hours')::text,
  'America/Los_Angeles',
  'Crush Bar', '1400 SE Morrison St', 'Portland', 'OR', '97214', '@crushbarpdx',
  10, '00000000-0000-0000-0000-000000000001', 'Crush Bar',
  ARRAY['pdx-perf-002', 'pdx-perf-004', 'pdx-perf-010'],
  true, 'weekly'
),

(
  'Drag 101 Open Showcase',
  'Celestia Moon''s monthly showcase for emerging performers. A safe, supportive space for queens, kings, and all royalty to perform publicly for the first time — or the hundredth. Celestia hosts and mentors on stage. Audiences are the most supportive in town.',
  (NOW() + INTERVAL '21 days')::text,
  (NOW() + INTERVAL '21 days' + INTERVAL '2 hours')::text,
  'America/Los_Angeles',
  'Crush Bar', '1400 SE Morrison St', 'Portland', 'OR', '97214', '@crushbarpdx',
  0, '00000000-0000-0000-0000-000000000001', 'Celestia Moon',
  ARRAY['pdx-perf-003'],
  true, 'monthly'
),

-- The Eagle PDX
(
  'Leather & Lace: A Benefit Show',
  'Lavender Haze and friends perform a benefit show for Outside In, Portland''s LGBTQ+ youth services organization. All ticket proceeds go directly to the organization. A night of powerful performances, community, and genuine love for the people who need it most.',
  (NOW() + INTERVAL '17 days')::text,
  (NOW() + INTERVAL '17 days' + INTERVAL '2 hours 30 minutes')::text,
  'America/Los_Angeles',
  'The Eagle PDX', '835 N Lombard St', 'Portland', 'OR', '97217', '@eaglepdx',
  20, '00000000-0000-0000-0000-000000000001', 'Lavender Haze',
  ARRAY['pdx-perf-010', 'pdx-perf-003', 'pdx-perf-006'],
  false, NULL
),

-- Scandals
(
  'Midnight Mayhem',
  'When the rest of Portland is winding down, Scandals is just getting started. Midnight Mayhem is the late-night show for night owls: three performers, a DJ set, and no bedtime. Ginger Snapped hosts. Wear comfortable shoes — you will dance.',
  (NOW() + INTERVAL '8 days')::text,
  (NOW() + INTERVAL '8 days' + INTERVAL '4 hours')::text,
  'America/Los_Angeles',
  'Scandals', '1038 SW Stark St', 'Portland', 'OR', '97205', '@scandalspdx',
  10, '00000000-0000-0000-0000-000000000001', 'Scandals',
  ARRAY['pdx-perf-007', 'pdx-perf-002', 'pdx-perf-009'],
  true, 'weekly'
),

-- Mississippi Studios
(
  'Avant Drag: An Art Experience',
  'Midnight Soleil presents an evening of drag as performance art at Mississippi Studios. No lip syncing. No quick changes. One 75-minute piece exploring queerness, grief, and joy. Limited seating — this is an intimate experience intentionally. Not your average drag show, and that''s the point.',
  (NOW() + INTERVAL '25 days')::text,
  (NOW() + INTERVAL '25 days' + INTERVAL '2 hours')::text,
  'America/Los_Angeles',
  'Mississippi Studios', '3939 N Mississippi Ave', 'Portland', 'OR', '97227', '@mississippistudios',
  22, '00000000-0000-0000-0000-000000000001', 'Midnight Soleil',
  ARRAY['pdx-perf-006'],
  false, NULL
),

-- Valentine's special
(
  'Tuck''s Roller Disco Drag Extravaganza',
  'Tuck N. Roll is doing it again — drag on wheels. This time with a full roller disco setup at an East Portland event space. Six performers, all on skates (or attempting to be), a live DJ spinning 70s-meets-hyperpop, and the most chaotic good energy in Portland. Come ready to fall down and get back up.',
  (NOW() + INTERVAL '30 days')::text,
  (NOW() + INTERVAL '30 days' + INTERVAL '3 hours')::text,
  'America/Los_Angeles',
  'Oaks Park Skating Rink', '7805 SE Oaks Park Way', 'Portland', 'OR', '97202', NULL,
  18, '00000000-0000-0000-0000-000000000001', 'Tuck N. Roll',
  ARRAY['pdx-perf-009', 'pdx-perf-007', 'pdx-perf-002', 'pdx-perf-004'],
  false, NULL
)

;
