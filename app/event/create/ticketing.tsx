// app/event/create/ticketing.tsx
import { useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getDraft, updateDraft } from '@/lib/createEventStore';
import { colors as C } from '../../../src/theme/colors';

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

    router.push('/event/create/roles');
  }

  const inputStyle = {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    color: C.textPrimary,
    marginTop: 6,
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen
        options={{
          title: 'Create Event • Ticketing',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
        }}
      />

      <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 4 }}>Ticketing</Text>
      <Text style={{ color: C.textMuted, marginBottom: 20 }}>Set your ticket price and payout details.</Text>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: C.textPrimary, fontWeight: '800' }}>Ticket Price (USD)</Text>
        <TextInput
          keyboardType="numeric"
          placeholder="15.00 (leave blank for free)"
          placeholderTextColor={C.textMuted}
          value={ticketPrice}
          onChangeText={setTicketPrice}
          style={inputStyle}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: C.textPrimary, fontWeight: '800' }}>Payout Venmo Handle</Text>
        <TextInput
          placeholder="yourvenmohandle"
          placeholderTextColor={C.textMuted}
          value={payoutVenmo}
          onChangeText={setPayoutVenmo}
          style={inputStyle}
          autoCapitalize="none"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: C.textPrimary, fontWeight: '800' }}>Sales Start (optional)</Text>
        <TextInput
          placeholder="YYYY-MM-DD"
          placeholderTextColor={C.textMuted}
          value={salesStart}
          onChangeText={setSalesStart}
          style={inputStyle}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: C.textPrimary, fontWeight: '800' }}>Sales End (optional)</Text>
        <TextInput
          placeholder="Defaults to event end time"
          placeholderTextColor={C.textMuted}
          value={salesEnd}
          onChangeText={setSalesEnd}
          style={inputStyle}
        />
      </View>

      <PrimaryButton title="Roles & Lineup →" onPress={onProceedToReview} />
      <View style={{ height: 12 }} />
      <Pressable onPress={() => router.replace('/(tabs)/discover')} accessibilityRole="button">
        <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>
          Cancel
        </Text>
      </Pressable>
    </ScrollView>
  );
}