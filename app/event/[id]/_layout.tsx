// app/event/[id]/_layout.tsx
import { Stack } from 'expo-router';
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
      <Stack.Screen name="index"     options={{ title: 'Event' }} />
      <Stack.Screen name="checkin"   options={{ title: 'Door Check-In' }} />
      <Stack.Screen name="edit"      options={{ title: 'Edit Event' }} />
      <Stack.Screen name="roster"    options={{ title: 'Staff Roster' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="gig"       options={{ title: 'My Gig' }} />
      <Stack.Screen name="invoice"   options={{ title: 'Invoice' }} />
    </Stack>
  );
}
