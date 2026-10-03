// app/event/[id]/cancel.tsx
// Host-only: cancel a show. Shows exactly what will happen before the host
// confirms. Paid shows: every fan gets back everything they paid (service fee
// included), the ticket money comes back out of the host's payouts, and the
// host covers the card processing fees Stripe charged on those sales (Stripe
// doesn't return them on refunds). Free shows: no money moves; ticket holders
// are just told. All of the work happens in the cancel-event Edge Function.

import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { AccessRestricted } from '../../../components/AccessRestricted';
import { getSession } from '../../../lib/authStore';
import {
  cancelEvent,
  fetchEventById,
  getCancelQuote,
  type CancelQuote,
  type CancelResult,
  type EventRecord,
} from '../../../lib/eventsStore';
import { colors } from '../../../src/theme/colors';

const $ = (n: number) => `$${n.toFixed(2)}`;

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
      <Text style={{ color: color ?? colors.textSecondary, fontSize: 14, fontWeight: bold ? '800' : '400', flex: 1, paddingRight: 12 }}>{label}</Text>
      <Text style={{ color: color ?? colors.textSecondary, fontSize: 14, fontWeight: bold ? '800' : '400' }}>{value}</Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border, marginTop: 16 }}>
      {children}
    </View>
  );
}

export default function CancelShowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [quote, setQuote] = useState<CancelQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<CancelResult | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [ev, q] = await Promise.all([fetchEventById(id), getCancelQuote(id)]);
        setEvent(ev);
        setQuote(q);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not load this show.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isHost = event?.hostId === getSession()?.user?.id;
  if (!loading && event && !isHost) {
    return <AccessRestricted title="Host-only screen" body="Only this show's host can cancel it." />;
  }

  function confirm() {
    if (!quote || !id) return;
    const body = quote.isFreeShow
      ? `${quote.ticketHolders} ${quote.ticketHolders === 1 ? 'person' : 'people'} will be told the show is cancelled. This can't be undone.`
      : `${quote.paidTickets} ${quote.paidTickets === 1 ? 'fan' : 'fans'} will be refunded ${$(quote.refundToFans)} in total, and you'll be charged about ${$(quote.hostStripeFees)} in card processing fees. This can't be undone.`;
    Alert.alert('Cancel this show?', body, [
      { text: 'Keep the show', style: 'cancel' },
      {
        text: 'Cancel show',
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try {
            setResult(await cancelEvent(id, reason.trim() || undefined));
          } catch (e) {
            Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Could not cancel the show. Please try again.');
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen options={{ title: 'Cancel Show' }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : loadError || !quote ? (
          <Text style={{ color: colors.danger, marginTop: 20 }}>{loadError ?? 'Could not load this show.'}</Text>
        ) : result ? (
          // ── Done ──────────────────────────────────────────────────────────
          <>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '900' }}>Show cancelled</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 }}>{quote.eventTitle}</Text>
            <Card>
              {result.refundedCount > 0 && (
                <Row label={`${result.refundedCount} ${result.refundedCount === 1 ? 'fan' : 'fans'} refunded in full`} value={$(result.refundedTotal)} />
              )}
              {result.freeHoldersNotified > 0 && (
                <Row label={`${result.freeHoldersNotified} free ${result.freeHoldersNotified === 1 ? 'spot' : 'spots'}: holders notified`} value="$0.00" />
              )}
              {result.hostCharge && (
                <Row
                  label={result.hostCharge.status === 'collected'
                    ? 'Card processing fees charged to you'
                    : 'Card processing fees you owe'}
                  value={$(result.hostCharge.amount)}
                  bold
                />
              )}
              {!result.hostCharge && result.refundedCount === 0 && (
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No money changed hands.</Text>
              )}
            </Card>
            {result.hostCharge?.status === 'owed' && (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 12, lineHeight: 19 }}>
                We couldn't take this from your Stripe balance right now, so it's been noted on your account. We'll be in touch about settling it.
              </Text>
            )}
            {result.failedCount > 0 && (
              <Text style={{ color: colors.danger, fontSize: 13, marginTop: 12, lineHeight: 19 }}>
                {result.failedCount} {result.failedCount === 1 ? 'refund' : 'refunds'} didn't go through. Open this screen again to retry, or email bradleydion@thebradleyproject.com.
              </Text>
            )}
            <View style={{ marginTop: 24 }}>
              <PrimaryButton title="Back to My Events" onPress={() => router.replace('/(tabs)/organize' as any)} />
            </View>
          </>
        ) : quote.alreadyCancelled && quote.paidTickets === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 20 }}>This show is already cancelled.</Text>
        ) : (
          // ── Review ────────────────────────────────────────────────────────
          <>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '900' }}>Cancel “{quote.eventTitle}”?</Text>

            {quote.isFreeShow ? (
              <Card>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>This is a free show, so no money changes hands.</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8, lineHeight: 20 }}>
                  {quote.ticketHolders > 0
                    ? `We'll let the ${quote.ticketHolders} ${quote.ticketHolders === 1 ? 'person' : 'people'} who reserved a spot know it's cancelled.`
                    : 'Nobody has reserved a spot yet.'}
                </Text>
              </Card>
            ) : (
              <>
                <Card>
                  <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>Your fans get everything back</Text>
                  <Row label={`${quote.paidTickets} paid ${quote.paidTickets === 1 ? 'ticket' : 'tickets'}: ticket price`} value={$(quote.ticketSalesReturned)} />
                  {quote.serviceFeesWaived > 0 && <Row label="Sequins service fees (we give these back too)" value={$(quote.serviceFeesWaived)} />}
                  <Row label="Total refunded to fans" value={$(quote.refundToFans)} bold color={colors.textPrimary} />
                  {quote.freeTickets > 0 && (
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 10 }}>
                      Plus {quote.freeTickets} free {quote.freeTickets === 1 ? 'spot' : 'spots'}: we'll let them know.
                    </Text>
                  )}
                </Card>

                <Card>
                  <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>What it costs you</Text>
                  <Row label="Ticket sales returned (taken back from your payouts)" value={$(quote.ticketSalesReturned)} />
                  <Row label="Card processing fees on these sales" value={`about ${$(quote.hostStripeFees)}`} />
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 10, lineHeight: 19 }}>
                    Stripe charged these fees when your fans paid, and it doesn't give them back when a sale is refunded. When a host cancels, the host covers them. Sequins waives its own service fee. The exact amount comes from Stripe and may differ by a few cents.
                  </Text>
                </Card>
              </>
            )}

            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 8 }}>
              Tell your fans why (optional)
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Our headliner is sick. We'll reschedule soon!"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={140}
              style={{
                backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: 12,
                borderWidth: 1, borderColor: colors.border, padding: 14, minHeight: 70, fontSize: 15,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ marginTop: 24, gap: 12 }}>
              <PrimaryButton
                title={working ? 'Cancelling…' : quote.isFreeShow ? 'Cancel show' : `Cancel show and refund ${quote.paidTickets} ${quote.paidTickets === 1 ? 'fan' : 'fans'}`}
                variant="danger"
                onPress={working ? () => {} : confirm}
              />
              <PrimaryButton title="Keep the show" variant="ghost" onPress={() => router.back()} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
