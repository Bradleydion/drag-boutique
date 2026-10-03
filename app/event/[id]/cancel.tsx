// app/event/[id]/cancel.tsx
// Host-only: cancel a show. Shows exactly what will happen before the host
// confirms. Paid shows: every fan gets back everything they paid (service fee
// included), the ticket money comes back out of the host's payouts, and the
// host covers the card processing fees Stripe charged on those sales (Stripe
// doesn't return them on refunds). Free shows: no money moves; ticket holders
// are just told. All of the work happens in the cancel-event Edge Function.

import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { AccessRestricted } from '../../../components/AccessRestricted';
import { getSession } from '../../../lib/authStore';
import {
  cancelEvent,
  fetchEventById,
  getCancelQuote,
  upcomingOccurrences,
  type CancelQuote,
  type CancelTarget,
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
  // Recurring shows: cancel one date ('date') or the whole series ('series').
  const [occurrences, setOccurrences] = useState<string[]>([]);
  const [mode, setMode] = useState<'date' | 'series'>('series');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const target: CancelTarget = mode === 'date' && selectedDate
    ? { occurrenceStart: selectedDate, includeUndated: selectedDate === occurrences[0] }
    : {};

  // Load the show once.
  useEffect(() => {
    if (!id) return;
    (async () => {
      const ev = await fetchEventById(id);
      setEvent(ev);
      if (ev?.isRecurring) {
        const dates = upcomingOccurrences(ev, 8);
        setOccurrences(dates);
        if (dates.length) { setMode('date'); setSelectedDate(dates[0]); }
      }
      if (!ev) { setLoadError('Show not found.'); setLoading(false); }
    })();
  }, [id]);

  // (Re)load the cost breakdown whenever the choice changes.
  useEffect(() => {
    if (!id || !event) return;
    let stale = false;
    setLoading(true);
    getCancelQuote(id, target)
      .then(q => { if (!stale) { setQuote(q); setLoadError(null); } })
      .catch(e => { if (!stale) setLoadError(e instanceof Error ? e.message : 'Could not load this show.'); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [id, event, mode, selectedDate]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const isHost = event?.hostId === getSession()?.user?.id;
  if (!loading && event && !isHost) {
    return <AccessRestricted title="Host-only screen" body="Only this show's host can cancel it." />;
  }

  function confirm() {
    if (!quote || !id) return;
    const what = quote.singleDate && quote.dateLabel ? `the ${quote.dateLabel} show` : 'this show';
    const body = quote.isFreeShow
      ? `${what[0].toUpperCase()}${what.slice(1)} will be cancelled and ${quote.ticketHolders} ${quote.ticketHolders === 1 ? 'person' : 'people'} will be told. This can't be undone.`
      : `${quote.paidTickets} ${quote.paidTickets === 1 ? 'fan' : 'fans'} will be refunded ${$(quote.refundToFans)} in total, and you'll be charged about ${$(quote.hostStripeFees)} in card processing fees. This can't be undone.`;
    Alert.alert(quote.singleDate ? 'Cancel this date?' : 'Cancel this show?', body, [
      { text: 'Keep the show', style: 'cancel' },
      {
        text: 'Cancel show',
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try {
            setResult(await cancelEvent(id, reason.trim() || undefined, target));
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
        {loading && !quote ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : loadError || !quote ? (
          <Text style={{ color: colors.danger, marginTop: 20 }}>{loadError ?? 'Could not load this show.'}</Text>
        ) : result ? (
          // ── Done ──────────────────────────────────────────────────────────
          <>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '900' }}>{quote.singleDate ? 'Date cancelled' : 'Show cancelled'}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
              {quote.eventTitle}{quote.singleDate && quote.dateLabel ? ` · ${quote.dateLabel}` : ''}
            </Text>
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
                Your Stripe balance didn't have enough to cover this right now, so it will come out of your next ticket sales until it's paid. You can see what's left on your Payouts screen.
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

            {event?.isRecurring && occurrences.length > 0 && (
              <Card>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 10 }}>What are you cancelling?</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: mode === 'date' ? 12 : 0 }}>
                  {(['date', 'series'] as const).map(m => (
                    <Pressable
                      key={m}
                      onPress={() => { setMode(m); if (m === 'date' && !selectedDate) setSelectedDate(occurrences[0]); }}
                      style={{
                        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                        backgroundColor: mode === m ? colors.teal + '22' : colors.background,
                        borderWidth: 1, borderColor: mode === m ? colors.teal : colors.border,
                      }}
                    >
                      <Text style={{ color: mode === m ? colors.teal : colors.textSecondary, fontWeight: '700' }}>
                        {m === 'date' ? 'Just one night' : 'The whole series'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {mode === 'date' && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {occurrences.map(d => (
                      <Pressable
                        key={d}
                        onPress={() => setSelectedDate(d)}
                        style={{
                          paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
                          backgroundColor: selectedDate === d ? colors.coral : colors.background,
                          borderWidth: 1, borderColor: selectedDate === d ? colors.coral : colors.border,
                        }}
                      >
                        <Text style={{ color: selectedDate === d ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '700' }}>{fmtDate(d)}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 17 }}>
                  {mode === 'date'
                    ? 'Only that night is cancelled. The rest of the series stays on sale.'
                    : 'Every upcoming date is cancelled and the show comes off Sequins.'}
                </Text>
              </Card>
            )}

            {quote.isFreeShow ? (
              <Card>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  {(event?.ticketing?.price ?? 0) > 0 ? 'No paid tickets yet, so no money changes hands.' : 'This is a free show, so no money changes hands.'}
                </Text>
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
                title={working ? 'Cancelling…' : `${quote.singleDate ? 'Cancel this date' : 'Cancel show'}${quote.isFreeShow || quote.paidTickets === 0 ? '' : ` and refund ${quote.paidTickets} ${quote.paidTickets === 1 ? 'fan' : 'fans'}`}`}
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
