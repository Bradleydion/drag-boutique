// lib/maps.ts
import { Linking, Platform } from 'react-native';

/** Opens directions to an address in Apple Maps (iPhone) or Google Maps (everything else). */
export function openDirections(address: string) {
  const q = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `https://maps.apple.com/?daddr=${q}`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`),
  );
}
