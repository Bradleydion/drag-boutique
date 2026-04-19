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
      }}
    />
  );
}
