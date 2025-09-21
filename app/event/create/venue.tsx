// app/event/create/venue.tsx
import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateEventVenue() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFEB99' }}>
      <Stack.Screen options={{ title: 'Create Event • Venue' }} />
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#000', fontSize: 22, fontWeight: '900' }}>Venue (placeholder)</Text>
        <Text style={{ color: '#333', marginTop: 6 }}>We will build this next.</Text>
      </View>
    </SafeAreaView>
  );
}