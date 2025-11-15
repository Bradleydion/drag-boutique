// app/(tabs)/organize.tsx
import { useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';

export default function OrganizeTab() {
  useEffect(() => {
    // Auto-forward to the first step of Event Creation
    // Comment this out if you prefer to keep a landing screen here.
    router.replace('/event/create/basics');
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFEB99' }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#000', fontSize: 22, fontWeight: '900' }}>Create an Event</Text>
        <Text style={{ color: '#333', marginTop: 6 }}>
          Set up details, venue, and ticketing in a few steps.
        </Text>
        <View style={{ height: 16 }} />
        <PrimaryButton title="Start Event Setup" onPress={() => router.push('/event/create/basics')} />
      </View>
    </SafeAreaView>
  );
}