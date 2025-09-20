import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#FFEB99' },
          headerTitleStyle: { color: '#000' },
          headerTintColor: '#000',
          contentStyle: { backgroundColor: '#FFEB99' },
        }}
      >
        {/* Hide header for the tabs group so it doesn't show "(tabs)" */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}