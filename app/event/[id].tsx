// app/event/[id].tsx
import { PerformerAvatar } from '@/components/PerformerAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { events, performers } from '@/data/events';
import { openVenmoPay } from '@/lib/venmo';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../src/theme/colors';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find(e => e.id === id);
  if (!event) return <View><Text>Event not found.</Text></View>;

  const perf = event.performerIds
    .map(pid => performers.find(p => p.id === pid))
    .filter(Boolean) as typeof performers;

  const userId = 'demoUser'; // placeholder

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: event.title,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.navy },
          headerTitleStyle: { color: colors.textPrimary },
          headerTintColor: colors.teal,
        }}
      />
      <ScrollView style={{ backgroundColor: colors.navy }} contentContainerStyle={{ paddingBottom: 32 }}>
        <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 240 }} />
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800' }}>{event.title}</Text>
          <Text style={{ color: colors.accent, marginTop: 6, fontWeight: '600' }}>
            {new Date(event.dateTimeStart).toLocaleString()} • {event.venueName}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 22 }}>{event.description}</Text>

          {/* Performer avatars */}
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            {perf.map(p => (
              <PerformerAvatar key={p.id} id={p.id} photoUrl={p.photoUrl} />
            ))}
          </View>

          {/* Actions */}
          <View style={{ marginTop: 20, gap: 12 }}>
            <PrimaryButton
              title={`Buy Ticket — $${event.price.toFixed(2)}`}
              onPress={() => openVenmoPay(event.organizerVenmoHandle, event.price, `DB-${event.id}-${userId}`)}
            />
            <PrimaryButton
              title="Door Check-In"
              variant="ghost"
              onPress={() => {
                alert("Check-In stub: scan QR or enter code to mark attendee as checked in.");
              }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}