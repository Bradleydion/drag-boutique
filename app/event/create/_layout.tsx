// app/event/create/_layout.tsx
import { Stack } from 'expo-router';
import { colors } from '../../../src/theme/colors';

export default function CreateEventLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTitleStyle: { color: colors.textPrimary },
        headerTintColor: colors.teal,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.navy },
      }}
    >
      <Stack.Screen name="basics"    options={{ title: 'Create Event • Basics' }} />
      <Stack.Screen name="venue"     options={{ title: 'Create Event • Venue' }} />
      <Stack.Screen name="ticketing" options={{ title: 'Create Event • Ticketing' }} />
      <Stack.Screen name="review"    options={{ title: 'Review & Publish' }} />
      <Stack.Screen name="costs"     options={{ title: 'Cost Breakdown' }} />
    </Stack>
  );
}