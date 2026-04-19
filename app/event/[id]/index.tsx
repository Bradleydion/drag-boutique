// app/event/[id].tsx
import { PerformerAvatar } from '@/components/PerformerAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { events, performers } from '@/data/events';
import { isGuest } from '@/lib/authStore';
import { buyTicket, hasTicket, loadTickets } from '@/lib/ticketStore';
import { openVenmoPay } from '@/lib/venmo';
import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find(e => e.id === id);

  const [ticketed, setTicketed] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!event) return;
    loadTickets().then(() => setTicketed(hasTicket(event.id)));
  }, [event?.id]);

  if (!event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
        <Stack.Screen options={{ title: 'Event' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Event not found.</Text>
          <View style={{ height: 16 }} />
          <PrimaryButton title="Back to Discover" onPress={() => router.push('/(tabs)/discover')} />
        </View>
      </SafeAreaView>
    );
  }

  const perf = event.performerIds
    .map(pid => performers.find(p => p.id === pid))
    .filter(Boolean) as typeof performers;

  const isFree = event.price === 0;

  async function handleBuyTicket() {
    if (isGuest()) {
      Alert.alert(
        'Create an Account',
        'You need an account to buy tickets.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/auth') },
        ],
      );
      return;
    }

    setBuying(true);
    try {
      await buyTicket(event.id, event.price);
      setTicketed(true);

      if (!isFree && event.organizerVenmoHandle) {
        openVenmoPay(event.organizerVenmoHandle, event.price, `SEQ-${event.id}`);
      }

      Alert.alert(
        isFree ? '🎉 You\'re in!' : '🎉 Ticket Saved!',
        isFree
          ? 'Your spot has been reserved. See you there!'
          : 'Your ticket is saved. Complete payment in Venmo to confirm your spot.',
        [
          { text: 'View Tickets', onPress: () => router.push('/(tabs)/tickets') },
          { text: 'Stay Here', style: 'cancel' },
        ],
      );
    } catch {
      Alert.alert('Error', 'Could not save your ticket. Please try again.');
    } finally {
      setBuying(false);
    }
  }

  const dateStr = new Date(event.dateTimeStart).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const timeStr = new Date(event.dateTimeStart).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });

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
      <ScrollView style={{ backgroundColor: colors.navy }} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Hero image */}
        <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 260 }} />

        <View style={{ padding: 16 }}>

          {/* Title + date + venue */}
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900', lineHeight: 30 }}>
            {event.title}
          </Text>
          <Text style={{ color: colors.accent, marginTop: 6, fontWeight: '600', fontSize: 15 }}>
            {dateStr} at {timeStr}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 14 }}>
            📍 {event.venueName} · {event.city}
          </Text>

          {/* Description */}
          <Text style={{ color: colors.textSecondary, marginTop: 12, lineHeight: 22 }}>
            {event.description}
          </Text>

          {/* Performers */}
          {perf.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
                PERFORMERS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {perf.map(p => (
                  <Link key={p.id} href={`/performer/${p.id}`} asChild>
                    <Pressable style={{ alignItems: 'center', width: 60 }}>
                      <PerformerAvatar id={p.id} photoUrl={p.photoUrl} />
                      <Text
                        numberOfLines={2}
                        style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center', lineHeight: 14 }}
                      >
                        {p.stageName}
                      </Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </View>
          )}

          {/* Ticket card */}
          <View style={{
            marginTop: 28,
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: ticketed ? colors.teal + '55' : colors.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>
                {isFree ? 'Free Event' : `$${event.price.toFixed(2)} / ticket`}
              </Text>
              {ticketed && (
                <View style={{
                  backgroundColor: colors.teal + '22',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: colors.teal,
                }}>
                  <Text style={{ color: colors.teal, fontSize: 12, fontWeight: '700' }}>✓ Got a ticket</Text>
                </View>
              )}
            </View>

            {ticketed ? (
              <PrimaryButton
                title="View My Ticket"
                onPress={() => router.push('/(tabs)/tickets')}
              />
            ) : (
              <PrimaryButton
                title={buying ? 'Saving…' : isFree ? 'Reserve My Spot' : `Buy Ticket — $${event.price.toFixed(2)}`}
                onPress={handleBuyTicket}
              />
            )}

            {!isFree && !ticketed && (
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
                Tap to save your ticket, then complete payment in Venmo.
              </Text>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
