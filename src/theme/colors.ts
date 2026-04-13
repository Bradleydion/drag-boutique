// src/theme/colors.ts
// Sequins brand palette

export const colors = {
  // Core palette
  navy:    '#272932', // primary background, nav bar, dark surfaces
  teal:    '#0F7173', // primary brand color: buttons, active states, links
  coral:   '#F05D5E', // alerts, destructive actions, report button, badges
  peach:   '#D8A47F', // warm accent: event cards, highlights, secondary surfaces
  offWhite:'#E7ECEF', // card backgrounds, input fields, light surfaces

  // Semantic aliases (use these in components)
  background:   '#272932', // navy
  surface:      '#1E2027', // slightly lighter navy for cards
  surfaceAlt:   '#E7ECEF', // off-white for light-mode cards and inputs
  primary:      '#0F7173', // teal — buttons, active tabs
  danger:       '#F05D5E', // coral — errors, reports, destructive
  accent:       '#D8A47F', // peach — warm highlights
  textPrimary:  '#E7ECEF', // off-white on dark backgrounds
  textDark:     '#272932', // navy on light backgrounds
  textSecondary:'#A8B2B8', // muted text on dark backgrounds
  textMuted:    '#7A8690', // very muted
  border:       '#3A3D47', // subtle border on dark surfaces
  borderLight:  '#C8D0D6', // subtle border on light surfaces
  inputBg:      '#E7ECEF', // input field background
  headerBg:     '#272932', // nav/header background

  // Status
  success: '#2ECC71',
  warning: '#F39C12',
  error:   '#F05D5E', // same as coral/danger
};