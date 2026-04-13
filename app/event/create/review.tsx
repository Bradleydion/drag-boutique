// app/event/create/review.tsx
import { Stack, router } from 'expo-router';
import { useMemo, useCallback } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getDraft, resetDraft } from '../../../lib/createEventStore';
import { publishDraft } from '../../../lib/eventsStore';
import { colors as C } from '../../../src/theme/colors';

export default function CreateEvent_Review() {
  // Read draft fresh on each render — this ensures we always show
  // the latest data after navigating from ticketing/venue/basics.
  const d = getDraft();

  const rows = useMemo(() => [
    { label: 'Title',          value: d.title },
    { label: 'Description',    value: d.description },
    { label: 'Start',          value: d.datetimeStart },
    { label: 'End',            value: d.datetimeEnd },
    { label: 'Timezone',       value: d.timezone },
    { label: 'Venue',          value: d.venueName },
    { label: 'Address',        value: [d.venueAddress, d.venueCity, d.venueState, d.venueZip].filter(Boolean).join(', ') },
    { label: 'Venue Instagram',value: d.venueInstagram },
    { label: 'Ticket price',   value: typeof d.ticketPrice === 'number' ? `$${d.ticketPrice.toFixed(2)}` : d.ticketPrice === 0 ? 'Free' : undefined },
    { label: 'Payout Venmo',   value: d.payoutVenmo ? `@${d.payoutVenmo.replace(/^@/, '')}` : undefined },
    { label: 'Sales start',    value: d.salesStart },
    { label: 'Sales end',      value: d.salesEnd },
  ], [d]);

  const publish = useCallback(() => {
    publishDraft(d);
    resetDraft();
    Alert.alert('🎉 Published!', 'Your event is now live on Sequins.', [
      { text: 'Back to Discover', onPress: () => router.replace('/(tabs)/discover') },
    ]);
  }, [d]);

  const empty = rows.every((r) => !r.value);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Review & Publish',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900' }}>Review your event</Text>
        <Text style={{ color: C.textMuted, marginTop: 6 }}>Make sure everything looks right before publishing.</Text>

        {empty ? (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: C.textSecondary, marginBottom: 16 }}>
              No draft details yet — start from the beginning.
            </Text>
            <PrimaryButton title="Start with Basics" onPress={() => router.replace('/event/create/basics')} />
          </View>
        ) : (
          <>
            {/* Summary rows */}
            <View style={{
              backgroundColor: C.surface,
              borderRadius: 14,
              padding: 16,
              marginTop: 20,
              gap: 12,
            }}>
              {rows.filter(r => r.value).map((r) => (
                <View key={r.label}>
                  <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {r.label}
                  </Text>
                  <Text style={{ color: C.textPrimary, marginTop: 2, lineHeight: 20 }}>{r.value}</Text>
                </View>
              ))}
            </View>

            {/* Edit buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton variant="ghost" title="Basics" onPress={() => router.push('/event/create/basics')} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton variant="ghost" title="Venue" onPress={() => router.push('/event/create/venue')} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton variant="ghost" title="Tickets" onPress={() => router.push('/event/create/ticketing')} />
              </View>
            </View>

            <View style={{ height: 20 }} />
            <PrimaryButton title="Publish Event 🎉" onPress={publish} />
            <View style={{ height: 12 }} />
            <Pressable onPress={() => router.replace('/(tabs)/discover')} accessibilityRole="button">
              <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>Cancel</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
