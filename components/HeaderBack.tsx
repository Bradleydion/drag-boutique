// components/HeaderBack.tsx
// One Back button for every header in the app.
//
// On current iOS the system back button sometimes renders as an empty grey
// pill that doesn't respond (seen on Notifications, Subscription, Payout
// Setup). Every Stack in the app now hides the system button and uses this
// instead. It uses goBack(), which pops when there is history and otherwise
// goes to a sensible fallback screen, so Back always does something.
import { Pressable, Text } from 'react-native';
import type { Href } from 'expo-router';
import { colors } from '../src/theme/colors';
import { goBack } from '../lib/nav';

export function HeaderBack({ fallback = '/(tabs)/discover' as Href, label = 'Back' }: { fallback?: Href; label?: string }) {
  return (
    <Pressable
      onPress={() => goBack(fallback)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ paddingRight: 12, paddingVertical: 6 }}
    >
      <Text style={{ color: colors.teal, fontSize: 17, fontWeight: '600' }}>{'‹ '}{label}</Text>
    </Pressable>
  );
}

/** Drop-in for Stack screenOptions: `headerLeft: headerBack()` */
export const headerBack = (fallback?: Href) => () => <HeaderBack fallback={fallback} />;
