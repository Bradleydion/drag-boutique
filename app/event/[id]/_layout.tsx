// app/event/[id]/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { colors } from '../../../src/theme/colors';

export default function EventLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerTintColor: colors.teal,
        headerBackTitle: 'Back',
      }}
    >
      {/* Index is the first screen in this nested Stack — it has no inner-Stack
          predecessor, so we inject an explicit back button that pops the root Stack. */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Event',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ paddingRight: 8 }}>
              <Ionicons name="chevron-back" size={26} color={colors.teal} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="checkin"   options={{ title: 'Door Check-In' }} />
      <Stack.Screen name="edit"      options={{ title: 'Edit Event' }} />
      <Stack.Screen name="roster"    options={{ title: 'Staff Roster' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="gig"       options={{ title: 'My Gig' }} />
      <Stack.Screen name="invoice"   options={{ title: 'Invoice' }} />
    </Stack>
  );
}
