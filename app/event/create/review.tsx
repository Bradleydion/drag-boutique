// app/event/create/review.tsx
import { Stack, router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Button, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getDraft, resetDraft } from '../../../lib/createEventStore';
import { publishDraft } from '../../../lib/eventsStore';

const colors = { bg: '#FFEB99', text: '#000', sub: '#333', muted: '#555' };

export default function CreateEvent_Review() {
  const d = getDraft();

  const rows = useMemo(() => {
    return [
      { label: 'Title', value: d.title },
      { label: 'Description', value: d.description },
      { label: 'Start', value: d.datetimeStart },
      { label: 'End', value: d.datetimeEnd },
      { label: 'Timezone', value: d.timezone },
      { label: 'Venue name', value: d.venueName },
      { label: 'Address', value: [d.venueAddress, d.venueCity, d.venueState, d.venueZip].filter(Boolean).join(', ') },
      { label: 'Venue Instagram', value: d.venueInstagram },
      { label: 'Ticket price', value: typeof d.ticketPrice === 'number' ? `$${d.ticketPrice.toFixed(2)}` : undefined },
      { label: 'Payout Venmo', value: d.payoutVenmo ? `@${d.payoutVenmo.replace(/^@/, '')}` : undefined },
      { label: 'Sales start', value: d.salesStart },
      { label: 'Sales end', value: d.salesEnd },
    ];
  }, [d]);

  function publish() {
    publishDraft(d);
    resetDraft();
    Alert.alert('Published', 'Your event has been saved.');
    router.replace('/');
  }

  const empty = rows.every((r) => !r.value);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: 'Review & Publish',
          headerLeft: () => <Button title="Back" onPress={() => router.back()} />,
        }}
      />

      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>Review your event</Text>
          <Text style={{ color: colors.muted, marginTop: 6 }}>Make sure everything looks right before publishing.</Text>

          {empty ? (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: colors.sub }}>No draft details yet. Start with Basics.</Text>
              <View style={{ height: 12 }} />
              <PrimaryButton title="Go to Basics" onPress={() => router.replace('/event/create/basics')} />
            </View>
          ) : (
            <>
              <View style={{ height: 16 }} />
              {rows.map((r) => (
                <View key={r.label} style={{ marginBottom: 10 }}>
                  <Text style={{ color: colors.sub, fontWeight: '800' }}>{r.label}</Text>
                  <Text style={{ color: colors.text }}>{r.value || '—'}</Text>
                </View>
              ))}

              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ marginRight: 8, marginBottom: 8 }}>
                  <PrimaryButton title="Edit Basics" onPress={() => router.push('/event/create/basics')} />
                </View>
                <View style={{ marginRight: 8, marginBottom: 8 }}>
                  <PrimaryButton title="Edit Venue" onPress={() => router.push('/event/create/venue')} />
                </View>
                <View style={{ marginRight: 8, marginBottom: 8 }}>
                  <PrimaryButton title="Edit Ticketing" onPress={() => router.push('/event/create/ticketing')} />
                </View>
              </View>

              <View style={{ height: 16 }} />
              <PrimaryButton title="Publish" onPress={publish} />
              <View style={{ height: 12 }} />
              <Pressable onPress={() => router.replace('/')} accessibilityRole="button">
                <Text style={{ color: '#333', textAlign: 'center', textDecorationLine: 'underline' }}>Cancel and go back</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
