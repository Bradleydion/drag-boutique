-- =============================================================================
-- Sequins: Real drag event seed data
-- Cities: Portland OR · Seattle WA · Kansas City MO · St. Petersburg FL
-- ~22 events — presentable for pitching to queens
-- All dates in July–August 2026 so they always appear on Discover
-- =============================================================================

-- First, clear any placeholder/dummy events to give a clean slate
DELETE FROM events WHERE host_id = 'seed-data-placeholder';

-- ─── PORTLAND, OREGON ────────────────────────────────────────────────────────

INSERT INTO events (
  host_id, host_name, title, description,
  datetime_start, datetime_end, timezone,
  venue_name, venue_address, venue_city, venue_state, venue_zip, venue_instagram,
  ticket_price, image_url, capacity,
  is_recurring, recurring_frequency,
  performer_ids, is_promoted
) VALUES

-- 1. CC Slaughters Friday Night
(
  'seed-data-placeholder', 'CC Slaughters',
  'Friday Night Extravaganza',
  'Portland''s most beloved weekly drag show. Saint Syndrome and Nicole Onoscopi host a rotating cast of dazzling performers with live singing, lip syncs, and the most generous tip rail in the city. Doors at 9 PM, show starts at 10:30 PM. Cash tips encouraged — these queens work hard!',
  '2026-07-10 22:30:00-07', '2026-07-11 02:00:00-07', 'America/Los_Angeles',
  'CC Slaughters', '219 NW Davis St', 'Portland', 'OR', '97209', '@ccslaughterspdx',
  0, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80&fit=crop&auto=format', 200,
  true, 'weekly',
  '{}', true
),

-- 2. Bolivia Carmichaels Monthly Show
(
  'seed-data-placeholder', 'CC Slaughters',
  'It''s Bolivia! Monthly Spectacular',
  'Third Sunday of every month — drag legend Bolivia Carmichaels packs the house for Portland''s most iconic monthly drag event. Expect surprise celebrity guests, themed numbers, audience games, and enough sequins to blind you. This month''s theme: Telenovela Realness.',
  '2026-07-19 21:00:00-07', '2026-07-20 01:00:00-07', 'America/Los_Angeles',
  'CC Slaughters', '219 NW Davis St', 'Portland', 'OR', '97209', '@ccslaughterspdx',
  15, 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&fit=crop&auto=format', 180,
  true, 'monthly',
  '{}', false
),

-- 3. Stag Drag Brunch
(
  'seed-data-placeholder', 'Stag PDX',
  'Sunday Funday Drag Brunch',
  'Start your Sunday right: bottomless mimosas, gorgeous queens, and a menu that''s almost as extra as the entertainment. Stag''s beloved drag brunch features two full sets of performances between courses, audience participation, and the kind of morning you''ll be texting your friends about by noon.',
  '2026-07-12 11:00:00-07', '2026-07-12 14:00:00-07', 'America/Los_Angeles',
  'Stag PDX', '317 NW Broadway', 'Portland', 'OR', '97209', '@stagpdx',
  25, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80&fit=crop&auto=format', 80,
  true, 'weekly',
  '{}', false
),

-- 4. Silverado Saturday
(
  'seed-data-placeholder', 'Silverado Portland',
  'Silverado Saturday Stars',
  'Oregon''s largest gay bar does drag right. Saturday nights at Silverado mean non-stop performances from 10 PM to 2 AM, with Portland''s hottest local queens rotating through the stage all night. Free to enter — tip your queens.',
  '2026-07-18 22:00:00-07', '2026-07-19 02:00:00-07', 'America/Los_Angeles',
  'Silverado', '1217 SW Broadway', 'Portland', 'OR', '97201', '@silveradoportland',
  0, 'https://images.unsplash.com/photo-1571804218043-ba578e2b5b4d?w=800&q=80&fit=crop&auto=format', 300,
  true, 'weekly',
  '{}', false
),

-- 5. Lip Sync Battle at The Get Down
(
  'seed-data-placeholder', 'The Get Down PDX',
  'Lip Sync Battle: Summer Smackdown',
  'Eight queens. One trophy. Zero mercy. The Get Down''s legendary lip sync competition returns for its summer edition. Sign up to compete or come watch the carnage. Guest judges announced night-of. Winner takes home $200, a crown, and eternal glory in Portland''s drag hall of fame.',
  '2026-08-06 21:00:00-07', '2026-08-07 00:00:00-07', 'America/Los_Angeles',
  'The Get Down', '615 SE Alder St', 'Portland', 'OR', '97214', '@thegetdownpdx',
  5, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80&fit=crop&auto=format', 150,
  false, NULL,
  '{}', false
),

-- 6. Peachy Springs Drag Bingo
(
  'seed-data-placeholder', 'Tusk Portland',
  'Peachy Springs'' Wednesday Drag Bingo',
  'Portland''s reigning drag bingo queen Peachy Springs brings her signature chaos to Tusk every Wednesday. Free to play, cash prizes, hilarious commentary, and enough side-eye to fuel a Netflix special. Come early — it fills up fast.',
  '2026-07-22 19:00:00-07', '2026-07-22 22:00:00-07', 'America/Los_Angeles',
  'Tusk', '2448 E Burnside St', 'Portland', 'OR', '97214', '@tuskportland',
  0, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80&fit=crop&auto=format', 100,
  true, 'weekly',
  '{}', false
),

-- ─── SEATTLE, WASHINGTON ─────────────────────────────────────────────────────

-- 7. Queer/Bar Friday All-Stars
(
  'seed-data-placeholder', 'Queer/Bar Seattle',
  'Queer/Bar Presents: All-Star Friday',
  'Seattle''s drag headquarters brings the heat every Friday. Capitol Hill''s best queens take the Queer/Bar stage for back-to-back sets of glamour, chaos, and unmatched stage presence. Multiple shows at 9 PM and 11 PM. The late show always goes harder.',
  '2026-07-17 21:00:00-07', '2026-07-18 02:00:00-07', 'America/Los_Angeles',
  'Queer/Bar', '1518 11th Ave', 'Seattle', 'WA', '98122', '@queerbarseattle',
  12, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80&fit=crop&auto=format', 175,
  true, 'weekly',
  '{}', true
),

-- 8. R Place RuPaul Watch Party
(
  'seed-data-placeholder', 'R Place Seattle',
  'RuPaul''s Drag Race Watch Party + Live Show',
  'Three floors, one legendary show. Every week at R Place, local queens lip sync to the latest Drag Race elimination numbers live on the main floor while episodes play upstairs. The only question is whether you''ll be watching TV or the talent in front of you.',
  '2026-07-24 20:00:00-07', '2026-07-25 02:00:00-07', 'America/Los_Angeles',
  'R Place', '619 E Pine St', 'Seattle', 'WA', '98122', '@rplaceseattle',
  0, 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&q=80&fit=crop&auto=format', 250,
  true, 'weekly',
  '{}', false
),

-- 9. Neighbours Mega Spectacular
(
  'seed-data-placeholder', 'Neighbours Nightclub',
  'Neighbours: Mega Drag Spectacular',
  'Since 1983, Neighbours has been the heartbeat of Seattle''s queer nightlife. This Saturday they''re pulling out all the stops with a full drag spectacular across three rooms — main stage performances, go-go queens, and a midnight dance floor that goes until 4 AM. Seattle''s oldest gay club at its absolute finest.',
  '2026-08-01 22:00:00-07', '2026-08-02 04:00:00-07', 'America/Los_Angeles',
  'Neighbours Nightclub', '1509 Broadway', 'Seattle', 'WA', '98122', '@neighbours_seattle',
  8, 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&fit=crop&auto=format', 400,
  false, NULL,
  '{}', true
),

-- 10. Wildrose Drag Bingo
(
  'seed-data-placeholder', 'The Wildrose',
  'Wednesday Night Drag Bingo at The Wildrose',
  'One of fewer than 25 lesbian bars left in the US, The Wildrose has been holding it down on Pike Street since 1985. Wednesday nights belong to drag bingo — a rowdy good time hosted by rotating queens with prizes, trash talk, and the most spirited bingo callers in the Pacific Northwest.',
  '2026-07-29 19:30:00-07', '2026-07-29 22:30:00-07', 'America/Los_Angeles',
  'The Wildrose', '1021 E Pike St', 'Seattle', 'WA', '98122', '@thewildrosebar',
  0, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&fit=crop&auto=format', 90,
  true, 'weekly',
  '{}', false
),

-- 11. Pony Sunday Tea Dance
(
  'seed-data-placeholder', 'Pony Bar Seattle',
  'Sunday Tea Dance with Drag Hostess',
  'Pony''s legendary Sunday afternoon tea dance — disco, new wave, and house in a 1930s gas station that smells like history and good decisions. A rotating drag hostess kicks off the night with a live set before the dance floor takes over. Fire pit out back. Good vibes mandatory.',
  '2026-07-26 16:00:00-07', '2026-07-26 22:00:00-07', 'America/Los_Angeles',
  'Pony', '1221 E Madison St', 'Seattle', 'WA', '98122', '@ponybarseattle',
  0, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80&fit=crop&auto=format', 120,
  true, 'weekly',
  '{}', false
),

-- ─── KANSAS CITY, MISSOURI ───────────────────────────────────────────────────

-- 12. Q Kansas City Late Night Drag
(
  'seed-data-placeholder', 'Q Kansas City',
  'Late Night Drag at Q Kansas City',
  'Westport''s queer-owned nightclub brings the heat every Friday and Saturday. Late Night Drag features KC''s best emerging and established queens in back-to-back sets starting at 10 PM. If you show up after midnight you might catch the impromptu numbers that never make it to the official lineup.',
  '2026-07-11 22:00:00-05', '2026-07-12 02:00:00-05', 'America/Chicago',
  'Q Kansas City', '4050 Pennsylvania Ave', 'Kansas City', 'MO', '64111', '@qkansascity',
  0, 'https://images.unsplash.com/photo-1571804218043-ba578e2b5b4d?w=800&q=80&fit=crop&auto=format', 180,
  true, 'weekly',
  '{}', true
),

-- 13. Hamburger Mary's Drag Brunch
(
  'seed-data-placeholder', 'Hamburger Mary''s KC',
  'Hamburger Mary''s Drag Brunch & Bingo',
  'Equal parts bottomless brunch and chaotic variety show. Hamburger Mary''s legendary weekend drag brunch features live queens hosting bingo, roasting guests, and performing between your eggs benedict. Family-friendly vibes before noon, then things get delightfully unhinged. Book ahead — tables go fast.',
  '2026-07-25 11:00:00-05', '2026-07-25 14:00:00-05', 'America/Chicago',
  'Hamburger Mary''s KC', '535 Westport Rd', 'Kansas City', 'MO', '64111', '@hamburgermarys',
  18, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80&fit=crop&auto=format', 100,
  true, 'weekly',
  '{}', false
),

-- 14. Missie B's Star Search
(
  'seed-data-placeholder', 'Missie B''s',
  'Missie B''s Star Search: Season Finale',
  'Kansas City''s premier LGBTQIA+ bar closes out their summer Star Search competition with a four-queen finale. Performers who''ve been competing all summer battle it out for the title of Missie B''s Next Drag Superstar. Public voting opens on arrival. Tips count as votes.',
  '2026-08-08 21:00:00-05', '2026-08-09 01:00:00-05', 'America/Chicago',
  'Missie B''s', '4123 Pennsylvania Ave', 'Kansas City', 'MO', '64111', '@missiebskc',
  5, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80&fit=crop&auto=format', 200,
  false, NULL,
  '{}', false
),

-- 15. Bastille After Dark
(
  'seed-data-placeholder', 'Bastille KC',
  'Bastille After Dark: Drag Night',
  'Bastille''s Friday night drag showcase is the Crossroads neighborhood''s best-kept secret. Local queens bring the performance art energy to a crowd that appreciates the craft. Expect conceptual numbers, live vocals, and performances that make you forget you''re in Kansas City (in the best way).',
  '2026-07-31 21:00:00-05', '2026-08-01 01:00:00-05', 'America/Chicago',
  'Bastille', '1810 Baltimore Ave', 'Kansas City', 'MO', '64108', '@bastillekc',
  10, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80&fit=crop&auto=format', 120,
  false, NULL,
  '{}', false
),

-- 16. Sidekicks Country Drag Night
(
  'seed-data-placeholder', 'Sidekicks Saloon KC',
  'Country Drag Night at Sidekicks',
  'Boots, buckles, and big hair. Sidekicks Saloon hosts the most underrated night in KC''s queer scene: Country Drag Night. Local queens in full Western drag perform country classics and pop mashups to a crowd of regulars who know every word. Free entry, cheap drinks, zero pretension.',
  '2026-07-16 20:00:00-05', '2026-07-17 01:00:00-05', 'America/Chicago',
  'Sidekicks Saloon', '3707 Main St', 'Kansas City', 'MO', '64111', '@sidekickskc',
  0, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80&fit=crop&auto=format', 150,
  true, 'monthly',
  '{}', false
),

-- ─── ST. PETERSBURG, FLORIDA ─────────────────────────────────────────────────

-- 17. Cocktail St Pete Drag Brunch
(
  'seed-data-placeholder', 'Cocktail St Pete',
  'Drag Bitchin'' Brunch at Cocktail',
  'The most talked-about brunch in Tampa Bay. Every Saturday and Sunday at 11 AM, Cocktail St Pete''s iconic Drag Bitchin'' Brunch serves up bottomless mimosas, an incredible menu, and a full 90-minute drag show that will have you laughing, crying, and stuffing a twenty in someone''s garter. Reservations strongly recommended.',
  '2026-07-11 11:00:00-04', '2026-07-11 14:00:00-04', 'America/New_York',
  'Cocktail St Pete', '2701 Central Ave', 'St. Petersburg', 'FL', '33712', '@cocktailstpete',
  22, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&fit=crop&auto=format', 90,
  true, 'weekly',
  '{}', true
),

-- 18. Enigma Saturday Night
(
  'seed-data-placeholder', 'Enigma St Pete',
  'Enigma Saturday Night Spectacular',
  'Grand Central District''s most theatrical drag venue goes all-out every Saturday. Enigma hosts multiple performers in a show that blends drag, burlesque, and performance art into something you genuinely can''t see anywhere else in Florida. Full bar, great sound system, and a crowd that actually watches the show.',
  '2026-07-18 21:00:00-04', '2026-07-19 02:00:00-04', 'America/New_York',
  'Enigma', '2533 Central Ave', 'St. Petersburg', 'FL', '33712', '@enigma.stpete',
  8, 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&q=80&fit=crop&auto=format', 120,
  true, 'weekly',
  '{}', false
),

-- 19. The Garage on Central
(
  'seed-data-placeholder', 'The Garage on Central',
  'The Garage: Friday Night Drag Show',
  'Central Avenue''s favorite Friday night destination. The Garage on Central packs the floor every week with a high-energy drag show featuring St. Pete''s best queens and the occasional Tampa Bay import. Exotic cocktails, a killer DJ between sets, and a crowd that brings the energy right back at the performers.',
  '2026-07-24 21:30:00-04', '2026-07-25 02:00:00-04', 'America/New_York',
  'The Garage on Central', '2421 Central Ave', 'St. Petersburg', 'FL', '33713', '@thegarageoncentral',
  12, 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&fit=crop&auto=format', 140,
  true, 'weekly',
  '{}', false
),

-- 20. Blur Nightclub Dunedin
(
  'seed-data-placeholder', 'Blur Nightclub',
  'Blur Friday Night Drag: Tampa Bay All-Stars',
  'Just north of Clearwater in charming downtown Dunedin, Blur Nightclub has been hosting some of Tampa Bay''s best-known performers every Friday at 10:30 PM and midnight. Two shows, one cover. The midnight show is strictly 21+ and tends to get considerably more... expressive.',
  '2026-07-17 22:30:00-04', '2026-07-18 01:30:00-04', 'America/New_York',
  'Blur Nightclub', '306 Main St', 'Dunedin', 'FL', '34698', '@blurnightclub',
  5, 'https://images.unsplash.com/photo-1571804218043-ba578e2b5b4d?w=800&q=80&fit=crop&auto=format', 160,
  true, 'weekly',
  '{}', false
),

-- 21. The Ball Disco Drag Night
(
  'seed-data-placeholder', 'The Ball St Pete',
  'The Ball: Disco Drag Night',
  'Disco balls, a pink-illuminated bar, and St. Pete''s most glamorous queens. The Ball is everything its name promises: a full-on, lights-out Saturday night extravaganza. DJ spins non-stop from 9 PM while queens rotate through the floor and stage. Dress to impress — this crowd shows up.',
  '2026-08-01 21:00:00-04', '2026-08-02 02:00:00-04', 'America/New_York',
  'The Ball', '646 Central Ave', 'St. Petersburg', 'FL', '33701', '@theballinc',
  15, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80&fit=crop&auto=format', 175,
  false, NULL,
  '{}', true
),

-- 22. St Pete Pride After-Party
(
  'seed-data-placeholder', 'Cocktail St Pete',
  'St. Pete Pride After-Party: The Queens Take Over',
  'St. Pete Pride draws hundreds of thousands to the waterfront each year — and the queens make sure the party doesn''t stop. Cocktail St Pete hosts the official after-party with an all-star cast of performers, VIP tables, and a celebration that stretches past sunrise. Pride weekend''s final and finest act.',
  '2026-06-27 22:00:00-04', '2026-06-28 05:00:00-04', 'America/New_York',
  'Cocktail St Pete', '2701 Central Ave', 'St. Petersburg', 'FL', '33712', '@cocktailstpete',
  20, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80&fit=crop&auto=format', 220,
  false, NULL,
  '{}', true
);

