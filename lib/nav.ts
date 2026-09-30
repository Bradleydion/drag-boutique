// lib/nav.ts
// Back navigation that always does something.
//
// router.back() silently does nothing when a screen has no history in its own
// stack (opened from a notification, a deep link, or as the first screen of a
// nested stack like event/[id]). That left testers stuck on screens with a
// dead Back button. goBack() falls back to a sensible screen instead.

import { router, type Href } from 'expo-router';

export function goBack(fallback: Href = '/(tabs)/discover'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
