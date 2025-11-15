// app/event/create/_layout.tsx
import { Stack } from 'expo-router';

export default function CreateEventLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFEB99' },
        headerTitleStyle: { color: '#000' },
        headerTintColor: '#000',
        contentStyle: { backgroundColor: '#FFEB99' },
      }}
    >
      <Stack.Screen name="basics" options={{ title: 'Create Event • Basics' }} />
      <Stack.Screen name="venue" options={{ title: 'Create Event • Venue' }} />
      <Stack.Screen name="ticketing" options={{ title: 'Create Event • Ticketing' }} />
      <Stack.Screen name="review" options={{ title: 'Review & Publish' }} />
    </Stack>
  );
}