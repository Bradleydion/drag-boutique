// app/event/[id]/refunds.tsx
// Host-only: review and act on pending ticket refund requests for this event.
// Approving actually refunds the buyer via Stripe (reversing the host's
// payout for that ticket); denying reverts the ticket back to "paid".

import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { fetchEventById, type EventRecord } from '../../../lib/eventsStore';
import { getSession } from '../../../lib/authStore';
import { AccessRestricted } from '../../../components/AccessRestricted';
import {
  approveTicketRefund,
  denyTicketRefund,
  loadEventRefundRequests,
  type Ticket,
} from '../../../lib/ticketStore';
import { colors } from '../../../src/theme/colors';

export default function EventRefundsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [requests, setRequests] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [ev, reqs] = await Promise.all([
      fetchEventById(id),
      loadEventRefundRequests(id),
    ]);
    setEvent(ev);
    setRequests(reqs);
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function handleApprove(ticket: Ticket) {
    Alert.alert(
      'Approve refund?',
      `This refunds $${Number(ticket.price).toFixed(2)} to the buyer through Stripe and reverses your payout for this ticket.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Refund',
          style: 'destructive',
          onPress: async () => {
            setActingId(ticket.id);
            try {
              await approveTicketRefund(ticket.id);
              await refresh();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not process refund.');
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    );
  }

  async function handleDeny(ticket: Ticket) {
    setActingId(ticket.id);
    try {
      await denyTicketRefund(ticket.id);
      await refresh();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not deny refund.');
    } finally {
      setActingId(null);
    }
  }

  const isHost = event?.hostId === getSession()?.user?.id;
  if (!loading && event && !isHost) {
    return <AccessRestricted title="Host-only screen" body="Only this event's host can view refund requests." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: 'Refund Requests',
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: 4 }}>
          {event?.title ?? 'Refund Requests'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 20 }}>
          {requests.length > 0
            ? `${requests.length} pending request${requests.length === 1 ? '' : 's'}`
            : 'No pending refund requests for this event'}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              You're all caught up — no refund requests waiting on you.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {requests.map(ticket => (
              <View
                key={ticket.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
                    Ticket #{ticket.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={{ color: colors.teal, fontWeight: '800', fontSize: 15 }}>
                    ${Number(ticket.price).toFixed(2)}
                  </Text>
                </View>
                {ticket.refund_requested_at && (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Requested {new Date(ticket.refund_requested_at).toLocaleDateString()}
                  </Text>
                )}
                {ticket.refund_reason && (
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>"{ticket.refund_reason}"</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={() => handleDeny(ticket)}
                    disabled={actingId === ticket.id}
                    style={{ flex: 1, backgroundColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>Deny</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleApprove(ticket)}
                    disabled={actingId === ticket.id}
                    style={{ flex: 1, backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 13 }}>
                      {actingId === ticket.id ? 'Processing…' : 'Approve & Refund'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable onPress={() => router.back()} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: colors.teal, fontWeight: '700' }}>← Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
