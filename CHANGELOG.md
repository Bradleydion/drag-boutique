# Changelog

All notable changes to this project will be documented here.

## [0.4.0] - 2026-04-13
### Added
- **Role selection onboarding screen** (`app/onboarding/index.tsx`)
  - Three selectable role cards: Fan, Artist, Host — each with tagline and feature perks
  - Animated selection state (teal fill when selected)
  - "Continue as [Role] →" CTA that activates only after a selection is made
  - Header hidden for clean full-screen presentation
- **User role store** (`lib/userStore.ts`)
  - `UserRole` type: `'fan' | 'artist' | 'host'`
  - `ROLES` config array drives the onboarding UI (emoji, title, tagline, perks)
  - `getRole`, `setRole`, `hasRole` helpers
- **Host role** defined with capabilities: create events, manage staff (DJs, door crew, tip takers), pay team via Venmo/Stripe, generate invoices, track finances
- **`metro.config.js`** — Expo Metro config baseline
- **`app/+not-found.tsx`** — rewritten with Sequins theme (removed stale ThemedText/ThemedView deps)

### Changed
- **App renamed from "Drag Boutique" to "Sequins"** across `app.json`, `package.json`, tab header, publish alert, colors comment, and URL scheme
- **`app/index.tsx`** — now routes new users to `/onboarding` if no role is set, otherwise straight to Discover
- **`babel.config.js`** — added `module-resolver` plugin mapping `@/` to project root, fixing all import alias errors across the app
- **`hooks/useThemeColor.ts`** — rewritten to use `src/theme/colors.ts` directly (removed dependency on deleted `constants/Colors.ts`)
- **Event detail screen** (`app/event/[id].tsx`) — header now shows event title dynamically; back button label changed from "(tabs)" to "Back"; header styled navy/teal

### Removed (Cleanup Sprint)
- Stale Expo starter template files: `HelloWave`, `Collapsible`, `ExternalLink`, `ThemedText`, `ThemedView`, `ParallaxScrollView`, `HapticTab`, `TabBarBackground`, `TabBarBackground.ios`, `AdSlot`
- Dead tab routes: `app/(tabs)/index.tsx`, `app/(tabs)/explore.tsx`
- Duplicate color file: `constants/Colors.ts` (consolidated into `src/theme/colors.ts`)
- Boilerplate `README.md` and React logo template assets

### Fixed
- Smart/curly quotes (from ChatGPT copy-paste) in `basics.tsx` and `venmo.ts` causing Metro bundler syntax errors
- `@/` path alias not resolving in Metro — fixed via Babel `module-resolver` plugin

### Known Issues
- Role selection is session-only (not persisted) — will add AsyncStorage persistence in auth sprint
- App folder is still named `drag-boutique` on disk (cosmetic only, doesn't affect app)

## [0.2.0] - 2025-11-15
### Added
- Initial MVP scaffold with Expo Router.
- Custom `PrimaryButton` component (black/gold theme).
- Custom `InstagramGrid` component for performer profiles.
- Event detail screen:
  - Performer avatars.
  - Actions: Buy via Venmo, Door Check-In (stub), Back to Discover.
- Performer detail screen:
  - Bio, booking info, and gold theme styling.
  - Actions: Tip via Venmo, Request Booking, Request Commission (when enabled), Back to Discover.
  - Instagram section with grid + external profile link.
- Discover page:
  - Updated header to **“Drag Boutique”**.
  - Consistent gold palette.
- Navigation:
  - Fixed `_layout.tsx` headers and back navigation.

### Notes
- Verified on Expo Go (iOS).
- Commission button enabled for Miss Nova Gold.
- Instagram grid shows placeholder images when `instagramPhotos` are present.

## [Unreleased] – Create Flow scaffolding, Review screen, Tabs cleanup

### Added
- Event Creation flow screens:
  - `app/event/create/basics.tsx` — Basics form (title, description, start/end, timezone) with validation and **Review Now** shortcut.
  - `app/event/create/venue.tsx` — Venue form (name, address, city, state, ZIP, Instagram) + **Open in Maps** and cancel-to-Discover.
  - `app/event/create/ticketing.tsx` — Ticketing (price, Venmo handle, sales window). Auto-fills sales end from event end if blank.
  - `app/event/create/review.tsx` — **Review & Publish** summary with quick edit buttons and Publish (stub) → returns to Discover.
- Draft state:
  - `lib/createEventStore.ts` — in-memory draft with `getDraft`, `updateDraft`, `resetDraft`, `hasDraft`, `draftSummary`.
  - `app/(tabs)/organize.tsx` — “Draft hub” to Resume/Edit/Discard draft and Create New Event.
- Published events (MVP):
  - `lib/eventsStore.ts` — `publishDraft()` converts draft → `EventRecord` in memory.
  - Introduced initial `src` directory structure (`src/components`, `src/theme`, `src/data`, etc.).
- Added `module-resolver` Babel plugin with alias paths (`@components`, `@theme`, `@data`, etc.).
- Added shared color theme at `src/theme/colors.ts`.
- Added `DevDebugBanner` component for environment/debugging visibility.
- Added initial `tsconfig.json` path mappings to sync TypeScript with alias imports.

### Changed
- Tabs layout in `app/(tabs)/_layout.tsx`:
  - Tabs now `discover`, `organize`, `tickets`, `profile`.
  - Create tab has a **Back** header button.
- Navigation polish:
  - Cancel links route to root (`/`) which is Discover.
  - Venue → Ticketing uses relative navigation and route is registered in `create/_layout`.
- Color palette:
  - All new screens uses gold (#FFEB99) background with black/gray text.
  - Updated Babel and TypeScript configuration to support project aliasing (`module-resolver` + TS `paths`).

### Fixed
- Multiple path import issues by switching to correct relative imports.
- Removed unsupported styles (e.g., `rowGap`) and added safe guards for optional fields.
- Resolved duplicate `<Tabs>` element that caused “Adjacent JSX elements” bundling error.

### Known Issues / To Triage Next
- **Migration to `src/` structure needed**: Components and data files currently reside in root-level `components/` and `data/`. Plan to migrate all non-route files into `src/` and update imports to use alias paths (`@components`, `@data`, `@theme`). Migration scheduled for next working session.
- **Review screen shows empty**: verify `updateDraft` is called on each step before navigating; ensure Review reads from `getDraft()` (no accidental store redefinition).
- **Basics screen missing “Review Now”** for some builds: ensure the button is present and its `updateDraft(...)` call runs, then `router.push('/event/create/review')`.
- Router warnings:
  - `Route "./event/create/costs.tsx" is missing default export` (placeholder screen; add or remove).
  - `No route named "index"/"explore"`: expected with new tab names; ensure no code still links to old routes.
- Occasional “GO_BACK not handled” in dev when opening Create from a fresh app state: benign in prod; consider routing to `/` when there’s no back stack.