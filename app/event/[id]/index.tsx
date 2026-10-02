// app/event/[id]/index.tsx
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchEventById, rollToNextOccurrence, type EventRecord } from '../../../lib/eventsStore';
import { isGuest } from '../../../lib/authStore';
import { buyTicket, createPaymentIntent, getTicketQuote, hasTicket, loadTickets, type TicketPriceBreakdown } from '../../../lib/ticketStore';
import { fetchPerformerById } from '../../../lib/performerStore';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors } from '../../../src/theme/colors';

function formatDate(iso?: string) {
  if (!iso) return 'Date TBD';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [event,      setEvent]      = useState<EventRecord | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [ticketed,   setTicketed]   = useState(false);
  const [buying,     setBuying]     = useState(false);
  const [quote,      setQuote]      = useState<TicketPriceBreakdown | null>(null);
  const [performers, setPerformers] = useState<
    { id: string; stageName: string; photoUrl?: string }[]
  >([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [ev] = await Promise.all([fetchEventById(id), loadTickets()]);
      // Recurring shows display their next upcoming date (matches Discover).
      setEvent(ev ? (rollToNextOccurrence(ev) ?? ev) : null);
      setTicketed(hasTicket(id));

      // Paid events: load the all-in price (ticket + service fee) up front.
      if ((ev?.ticketing?.price ?? 0) > 0) {
        getTicketQuote(id).then(setQuote);
      }

      if (ev?.performerIds?.length) {
        const profiles = await Promise.all(
          ev.performerIds.map(pid => fetchPerformerById(pid).catch(() => null)),
        );
        setPerformers(
          profiles
            .filter(Boolean)
            .map(p => ({ id: p!.id, stageName: p!.stageName, photoUrl: p!.photoUrl })),
        );
      }
      setLoading(false);
    })();
  }, [id]);

  // ── Buy ticket ──────────────────────────────────────────────────────────────
  async function handleBuyTicket() {
    if (isGuest()) {
      Alert.alert('Create an Account', 'You need an account to buy tickets.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Up', onPress: () => router.push('/auth') },
      ]);
      return;
    }
    if (!event) return;

    const price = event.ticketing?.price ?? 0;
    setBuying(true);

    try {
      if (price === 0) {
        // ── Free ticket: skip Stripe entirely ───────────────────────────────
        await buyTicket(event.id, 0);
        setTicketed(true);
        Alert.alert(
          '🎉 You\'re in!',
          'Your spot has been reserved. See you there!',
          [
            { text: 'View Tickets', onPress: () => router.push('/(tabs)/tickets') },
            { text: 'Stay Here', style: 'cancel' },
          ],
        );
      } else {
        // ── Paid ticket: Stripe payment sheet ───────────────────────────────

        // 1. Create PaymentIntent via Edge Function (Stripe Connect destination
        //    charge: Sequins' service fee + the host's payout, split automatically)
        //    The fan pays ticket price + service fee; the host gets the full ticket price.
        const paid = await createPaymentIntent(event.id, event.title);
        const { clientSecret, paymentIntentId, platformFeePercent, platformFeeAmount } = paid;
        setQuote(paid);

        // 2. Initialise Stripe payment sheet
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'Sequins',
          paymentIntentClientSecret: clientSecret,
          defaultBillingDetails: {},
          appearance: {
            colors: {
              primary: colors.teal,
              background: colors.navy,
              componentBackground: colors.surface,
              componentBorder: colors.border,
              primaryText: colors.textPrimary,
              componentText: colors.textPrimary, // typed card number/expiry/CVC
              icon: colors.textSecondary,
              secondaryText: colors.textSecondary,
              placeholderText: colors.textMuted,
            },
          },
        });

        if (initError) throw new Error(initError.message);

        // 3. Present the sheet — user enters card details
        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          // User cancelled — don't show an error
          if (presentError.code === 'Canceled') return;
          throw new Error(presentError.message);
        }

        // 4. Payment succeeded — record the ticket
        await buyTicket(event.id, paid.ticketPrice, paymentIntentId, platformFeePercent, platformFeeAmount);
        setTicketed(true);

        Alert.alert(
          '🎉 Ticket Confirmed!',
          `You paid $${paid.total.toFixed(2)} ($${paid.ticketPrice.toFixed(2)} ticket + $${paid.serviceFee.toFixed(2)} service fee). See you at the show!`,
          [
            { text: 'View Tickets', onPress: () => router.push('/(tabs)/tickets') },
            { text: 'Stay Here', style: 'cancel' },
          ],
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not complete your purchase. Please try again.');
    } finally {
      setBuying(false);
    }
  }

  // ── Loading / not found states ───────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.navy }}>
        <Stack.Screen options={{
          title: 'Event',
          headerStyle: { backgroundColor: colors.navy },
          headerTitleStyle: { color: colors.textPrimary },
          headerTintColor: colors.teal,
        }} />
        <ActivityIndicator color={colors.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.navy }}>
        <Stack.Screen options={{
          title: 'Event',
          headerStyle: { backgroundColor: colors.navy },
          headerTitleStyle: { color: colors.textPrimary },
          headerTintColor: colors.teal,
        }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🔍</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
            Event not found
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
            This event may have been removed or the link is invalid.
          </Text>
          <View style={{ height: 20 }} />
          <PrimaryButton title="Back to Discover" onPress={() => router.push('/(tabs)/discover')} />
        </View>
      </SafeAreaView>
    );
  }

  const price  = event.ticketing?.price ?? 0;
  const isFree = price === 0;
  const GOLD   = '#F59E0B';

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: event.title,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.navy },
          headerTitleStyle: { color: colors.textPrimary },
          headerTintColor: colors.teal,
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Hero image */}
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 260 }} resizeMode="cover" />
        ) : (
          <View style={{ width: '100%', height: 180, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 56 }}>🎭</Text>
          </View>
        )}

        <View style={{ padding: 16 }}>

          {/* Promoted badge */}
          {event.isPromoted && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: GOLD + '18', borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 5,
              borderWidth: 1, borderColor: GOLD + '66',
              alignSelf: 'flex-start', marginBottom: 10,
            }}>
              <Text style={{ color: GOLD, fontSize: 12, fontWeight: '800' }}>✦ Promoted</Text>
            </View>
          )}

          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900', lineHeight: 30 }}>
            {event.title}
          </Text>

          <Text style={{ color: colors.teal, marginTop: 6, fontWeight: '600', fontSize: 15 }}>
            🗓 {formatDate(event.datetimeStart)}
          </Text>

          {event.venue?.name && (
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>
              📍 {event.venue.name}
              {event.venue.city ? `, ${event.venue.city}` : ''}
              {event.venue.state ? `, ${event.venue.state}` : ''}
            </Text>
          )}

          {event.hostName && (
            <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
              Hosted by {event.hostName}
            </Text>
          )}

          {event.isRecurring && event.recurringFrequency && (
            <View style={{
              marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.surface, borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 5,
              alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                🔁 {event.recurringFrequency.charAt(0).toUpperCase() + event.recurringFrequency.slice(1)}
                {event.recurringEndDate ? ` · ends ${event.recurringEndDate}` : ''}
              </Text>
            </View>
          )}

          {event.description ? (
            <Text style={{ color: colors.textSecondary, marginTop: 14, lineHeight: 22, fontSize: 15 }}>
              {event.description}
            </Text>
          ) : null}

          {/* Performers */}
          {performers.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={{
                color: colors.textMuted, fontSize: 11, fontWeight: '700',
                letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase',
              }}>
                Performers
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {performers.map(p => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/performer/${p.id}` as any)}
                    style={{ alignItems: 'center', width: 64 }}
                  >
                    {p.photoUrl ? (
                      <Image source={{ uri: p.photoUrl }} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.teal }} />
                    ) : (
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.teal }}>
                        <Text style={{ fontSize: 22 }}>💃</Text>
                      </View>
                    )}
                    <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 11, marginTop: 5, textAlign: 'center', lineHeight: 14 }}>
                      {p.stageName}
                    </Text>
                  </Pressable>
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
                {isFree ? 'Free Event' : `$${(quote?.total ?? price).toFixed(2)} / ticket`}
              </Text>
              {ticketed && (
                <View style={{
                  backgroundColor: colors.teal + '22', borderRadius: 12,
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: colors.teal,
                }}>
                  <Text style={{ color: colors.teal, fontSize: 12, fontWeight: '700' }}>✓ Got a ticket</Text>
                </View>
              )}
            </View>

            {!isFree && !ticketed && (
              <View style={{ marginTop: -4, marginBottom: 14 }}>
                {quote ? (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Ticket</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>${quote.ticketPrice.toFixed(2)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Sequins service fee</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>${quote.serviceFee.toFixed(2)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800' }}>Total</Text>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800' }}>${quote.total.toFixed(2)}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Plus a small Sequins service fee, shown before you pay.</Text>
                )}
              </View>
            )}

            {ticketed ? (
              <PrimaryButton title="View My Ticket" onPress={() => router.push('/(tabs)/tickets')} />
            ) : (
              <PrimaryButton
                title={
                  buying
                    ? (isFree ? 'Reserving…' : 'Opening payment…')
                    : isFree
                    ? 'Reserve My Spot'
                    : `Buy Ticket  ·  $${(quote?.total ?? price).toFixed(2)}`
                }
                onPress={handleBuyTicket}
              />
            )}

            {!isFree && !ticketed && (
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
                100% of the ticket price goes to the host. The service fee keeps Sequins running, covers all card processing, and isn’t refundable. Secure checkout by Stripe.
              </Text>
            )}

            {(event.ticketing?.salesStart || event.ticketing?.salesEnd) && (
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                {event.ticketing.salesStart ? `Sales open: ${event.ticketing.salesStart}` : ''}
                {event.ticketing.salesStart && event.ticketing.salesEnd ? '  ·  ' : ''}
                {event.ticketing.salesEnd ? `Closes: ${event.ticketing.salesEnd}` : ''}
              </Text>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
