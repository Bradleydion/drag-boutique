// app/event/create/ticketing.tsx
import { useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getDraft, updateDraft } from '@/lib/createEventStore';

const colors = { bg: '#FFEB99', text: '#000', sub: '#333', muted: '#555' };

export default function CreateEvent_Ticketing() {
  const d = getDraft();
  const [ticketPrice, setTicketPrice] = useState(d.ticketPrice?.toString() || '');
  const [payoutVenmo, setPayoutVenmo] = useState(d.payoutVenmo || '');
  const [salesStart, setSalesStart] = useState(d.salesStart || '');
  const [salesEnd, setSalesEnd] = useState(d.salesEnd || '');

  function onProceedToReview() {
    const errors: string[] = [];
    const priceNum = ticketPrice.trim() === '' ? undefined : parseFloat(ticketPrice);
    if (ticketPrice && (priceNum === undefined || Number.isNaN(priceNum) || priceNum < 0)) {
      errors.push('Ticket price must be a positive number.');
    }
    if (errors.length > 0) {
      Alert.alert('Fix required', errors.join('\n'));
      return;
    }

    updateDraft({
      ticketPrice: priceNum,
      payoutVenmo: payoutVenmo.trim().replace(/^@/, ''),
      salesStart: salesStart.trim() || undefined,
      salesEnd: (salesEnd.trim() || d.datetimeEnd || '').trim() || undefined,
    });

    router.push('../review');
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen
        options={{
          title: 'Create Event • Ticketing',
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.text,
        }}
      />

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 6 }}>Ticket Price (USD)</Text>
        <TextInput
          keyboardType="numeric"
          placeholder="0.00"
          value={ticketPrice}
          onChangeText={setTicketPrice}
          style={{
            borderColor: colors.muted,
            borderWidth: 1,
            borderRadius: 4,
            padding: 8,
            color: colors.text,
          }}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 6 }}>Payout Venmo Handle</Text>
        <TextInput
          placeholder="venmohandle"
          value={payoutVenmo}
          onChangeText={setPayoutVenmo}
          style={{
            borderColor: colors.muted,
            borderWidth: 1,
            borderRadius: 4,
            padding: 8,
            color: colors.text,
          }}
          autoCapitalize="none"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 6 }}>Sales Start</Text>
        <TextInput
          placeholder="YYYY-MM-DD"
          value={salesStart}
          onChangeText={setSalesStart}
          style={{
            borderColor: colors.muted,
            borderWidth: 1,
            borderRadius: 4,
            padding: 8,
            color: colors.text,
          }}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.sub, fontWeight: '700', marginBottom: 6 }}>Sales End</Text>
        <TextInput
          placeholder="YYYY-MM-DD"
          value={salesEnd}
          onChangeText={setSalesEnd}
          style={{
            borderColor: colors.muted,
            borderWidth: 1,
            borderRadius: 4,
            padding: 8,
            color: colors.text,
          }}
        />
      </View>

      <PrimaryButton title="Review" onPress={onProceedToReview} />
    </ScrollView>
  );
}