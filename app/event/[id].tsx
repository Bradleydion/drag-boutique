// app/event/[id].tsx
import { AdSlot } from '@/components/AdSlot';
import { PerformerAvatar } from '@/components/PerformerAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { events, performers } from '@/data/events';
import { openVenmoPay } from '@/lib/venmo';
import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = { bg: '#FFEB99', text: '#000000', sub: '#333333', muted: '#555555' };

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find(e => e.id === id);
  if (!event) return <View><Text>Event not found.</Text></View>;

  const perf = event.performerIds
    .map(pid => performers.find(p => p.id === pid))
    .filter(Boolean) as typeof performers;

  const userId = 'demoUser'; // placeholder

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
        <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 240 }} />
        <View style={{ padding: 16, backgroundColor: colors.bg }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{event.title}</Text>
          <Text style={{ color: colors.sub, marginTop: 6 }}>
            {new Date(event.dateTimeStart).toLocaleString()} • {event.venueName}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 8 }}>{event.description}</Text>
          <Text style={{ color: '#000', marginTop: 6 }}>MARKER: event v3</Text>
          <Text style={{ color: '#000', marginTop: 6 }}>theme: gold v1</Text>

          {/* Performer avatars */}
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            {perf.map(p => (
              <PerformerAvatar key={p.id} id={p.id} photoUrl={p.photoUrl} />
            ))}
          </View>

          {/* Actions */}
          <View style={{ marginTop: 16, rowGap: 12 }}>
            <PrimaryButton
              title={`Buy via Venmo — $${event.price.toFixed(2)}`}
              onPress={() => openVenmoPay(event.organizerVenmoHandle, event.price, `DB-${event.id}-${userId}`)}
            />
            <PrimaryButton
              title="Door Check-In (stub)"
              onPress={() => {
                alert("Check-In stub: we'll scan a QR or enter a code to mark an attendee as checked in.");
              }}
            />
          </View>
        </View>

        <AdSlot slot="event" />
      </ScrollView>
    </SafeAreaView>
  );
}