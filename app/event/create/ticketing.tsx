// app/event/create/ticketing.tsx
import { useEffect, useState } from 'react';
import { DateTimeField } from '@/components/DateTimeField';
import { View, Text, TextInput, Alert, ScrollView, Pressable, Switch } from 'react-native';
import { Stack, router } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getDraft, updateDraft } from '@/lib/createEventStore';
import { colors as C } from '../../../src/theme/colors';

export default function CreateEvent_Ticketing() {
  const d = getDraft();
  const [ticketPrice, setTicketPrice] = useState(d.ticketPrice?.toString() || '');
  const [salesStart, setSalesStart] = useState(d.salesStart || '');
  const [salesEnd, setSalesEnd] = useState(d.salesEnd || '');
  const [allSalesFinal, setAllSalesFinal] = useState(d.allSalesFinal ?? false);
  const [refundWindowDays, setRefundWindowDays] = useState(
    d.refundWindowDays != null ? String(d.refundWindowDays) : '',
  );
  const [capacity, setCapacity] = useState(d.capacity != null ? String(d.capacity) : '');

  // Save as the host types (valid values only), so Back never loses anything.
  useEffect(() => {
    const p = ticketPrice.trim() === '' ? undefined : parseFloat(ticketPrice);
    const w = refundWindowDays.trim() === '' ? null : parseInt(refundWindowDays, 10);
    const c = capacity.trim() === '' ? undefined : parseInt(capacity, 10);
    updateDraft({
      ticketPrice: p !== undefined && !Number.isNaN(p) ? p : undefined,
      salesStart: salesStart || undefined,
      salesEnd: salesEnd || undefined,
      allSalesFinal,
      refundWindowDays: allSalesFinal ? null : (w !== null && !Number.isNaN(w) ? w : null),
      capacity: c !== undefined && !Number.isNaN(c) && c > 0 ? c : undefined,
    });
  }, [ticketPrice, salesStart, salesEnd, allSalesFinal, refundWindowDays, capacity]);

  function onProceedToReview() {
    const errors: string[] = [];
    const priceNum = ticketPrice.trim() === '' ? undefined : parseFloat(ticketPrice);
    if (ticketPrice && (priceNum === undefined || Number.isNaN(priceNum) || priceNum < 0)) {
      errors.push('Ticket price must be a positive number.');
    }
    const windowNum = refundWindowDays.trim() === '' ? null : parseInt(refundWindowDays, 10);
    if (!allSalesFinal && refundWindowDays.trim() !== '' && (windowNum === null || Number.isNaN(windowNum) || windowNum < 0)) {
      errors.push('Refund window must be a positive number of days.');
    }
    if (errors.length > 0) {
      Alert.alert('Fix required', errors.join('\n'));
      return;
    }

    const capNum = capacity.trim() === '' ? undefined : parseInt(capacity, 10);
    if (capacity.trim() !== '' && (capNum === undefined || Number.isNaN(capNum) || capNum <= 0)) {
      Alert.alert('Fix required', 'Capacity must be a whole number, or leave it blank.');
      return;
    }

    updateDraft({
      capacity: capNum,
      ticketPrice: priceNum,
      salesStart: salesStart.trim() || undefined,
      salesEnd: (salesEnd.trim() || d.datetimeEnd || '').trim() || undefined,
      allSalesFinal,
      refundWindowDays: allSalesFinal ? null : windowNum,
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
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: C.navy }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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
        <Text style={{ color: C.textPrimary, fontWeight: '800' }}>Capacity (optional)</Text>
        <TextInput
          keyboardType="number-pad"
          placeholder="Max tickets — leave blank for no limit"
          placeholderTextColor={C.textMuted}
          value={capacity}
          onChangeText={setCapacity}
          style={inputStyle}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <DateTimeField
          label="Sales start (optional)"
          placeholder="Tickets on sale right away"
          value={salesStart}
          onChange={setSalesStart}
          onClear={() => setSalesStart('')}
          defaultDate={new Date()}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <DateTimeField
          label="Sales end (optional)"
          placeholder="When the show ends"
          value={salesEnd}
          onChange={setSalesEnd}
          onClear={() => setSalesEnd('')}
          defaultDate={d.datetimeStart ? new Date(d.datetimeStart) : undefined}
        />
      </View>

      <View style={{ marginBottom: 24, backgroundColor: C.surface, borderRadius: 12, padding: 14 }}>
        <Text style={{ color: C.textPrimary, fontWeight: '800', marginBottom: 4 }}>Refund Policy</Text>
        <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>
          Buyers can request a refund through the app, within whatever window you set here.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: allSalesFinal ? 0 : 12 }}>
          <Text style={{ color: C.textPrimary, fontWeight: '600' }}>All Sales Are Final</Text>
          <Switch value={allSalesFinal} onValueChange={setAllSalesFinal} trackColor={{ true: C.teal }} />
        </View>

        {!allSalesFinal && (
          <View>
            <Text style={{ color: C.textPrimary, fontWeight: '600', marginBottom: 4 }}>
              Refund window (days before the event)
            </Text>
            <TextInput
              keyboardType="numeric"
              placeholder="Leave blank to allow refunds any time before the event"
              placeholderTextColor={C.textMuted}
              value={refundWindowDays}
              onChangeText={setRefundWindowDays}
              style={inputStyle}
            />
          </View>
        )}
      </View>

      <PrimaryButton title="Next: Lineup & Roles →" onPress={onProceedToReview} />
      <View style={{ height: 12 }} />
      <Pressable onPress={() => router.replace('/(tabs)/discover')} accessibilityRole="button">
        <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>
          Cancel
        </Text>
      </Pressable>
    </ScrollView>
  );
}