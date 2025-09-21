// app/performer/[id]/book.tsx
import { useState } from 'react';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Alert } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';

const colors = { bg: '#FFEB99', text: '#000', sub: '#333', field: '#fff3c2' };

export default function PerformerBooking() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  function submit() {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Please enter your name.');
      return;
    }
    Alert.alert('Request sent', `Your ${type === 'commission' ? 'commission' : 'booking'} request was queued.`);
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: type === 'commission' ? 'Request Commission' : 'Request Booking' }} />
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>
          {type === 'commission' ? 'Commission Details' : 'Booking Details'}
        </Text>

        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Your name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Jane Doe"
          placeholderTextColor="#666"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Preferred date</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="2025-10-31"
          placeholderTextColor="#666"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Event details, budget, special requests…"
          placeholderTextColor="#666"
          multiline
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6, minHeight: 90 }}
        />

        <View style={{ height: 20 }} />
        <PrimaryButton title="Submit" onPress={submit} />
      </View>
    </SafeAreaView>
  );
}




