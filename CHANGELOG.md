# Changelog

All notable changes to this project will be documented here.

## [0.1.0] - 2025-09-20
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