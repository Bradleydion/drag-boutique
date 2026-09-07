// app/performer/[id]/requests.tsx
// Booking request inbox — visible only to the performer who owns this profile.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  loadBookingRequests,
  acceptBookingRequest,
  declineBookingRequest,
  fetchPerformerById,
  type BookingRequest,
} from '../../../lib/performerStore';
import { colors as C } from '../../../src/theme/colors';

// ─── Single request card ──────────────────────────────────────────────────────

function RequestCard({
  req,
  onAccept,
  onDecline,
}: {
  req: BookingRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const isPending  = req.status === 'pending';
  const isAccepted = req.status === 'accepted';

  const statusColor = isAccepted ? '#34D399' : req.status === 'declined' ? '#F87171' : C.teal;
  const statusLabel = req.status.charAt(0).toUpperCase() + req.status.slice(1);

  const date = new Date(req.createdAt);
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isPending ? C.teal + '55' : C.border,
    }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
            {req.requesterName}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
            {req.requesterEmail}
          </Text>
        </View>

        {/* Type + status badges */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{
            backgroundColor: C.navy,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
              {req.requestType}
            </Text>
          </View>
          <View style={{
            backgroundColor: statusColor + '22',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}>
            <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Event date if provided */}
      {req.eventDate ? (
        <Text style={{ color: C.textSecondary, fontSize: 13, marginTop: 10 }}>
          📅 {req.eventDate}
        </Text>
      ) : null}

      {/* Message */}
      <Text style={{ color: C.textSecondary, fontSize: 14, marginTop: 8, lineHeight: 20 }}>
        {req.message}
      </Text>

      <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>{dateLabel}</Text>

      {/* Accept / Decline — only for pending */}
      {isPending && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Pressable
            onPress={onAccept}
            style={{
              flex: 1,
              backgroundColor: '#34D399',
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: C.navy, fontWeight: '800', fontSize: 14 }}>✓ Accept</Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#F87171',
            }}
          >
            <Text style={{ color: '#F87171', fontWeight: '800', fontSize: 14 }}>✕ Decline</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RequestsScreen() {
  const { id: performerId } = useLocalSearchParams<{ id: string }>();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [performerName, setPerformerName] = useState('');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(spinner = false) {
    if (spinner) setLoading(true);
    const [reqs, performer] = await Promise.all([
      loadBookingRequests(performerId),
      fetchPerformerById(performerId),
    ]);
    setRequests(reqs);
    setPerformerName(performer?.stageName ?? '');
    if (spinner) setLoading(false);
  }

  useEffect(() => { load(true); }, [performerId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [performerId]);

  async function handleAccept(req: BookingRequest) {
    Alert.alert(
      'Accept request?',
      `Accept the ${req.requestType} request from ${req.requesterName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptBookingRequest(req.id, performerName);
              setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'accepted' } : r));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not accept request.');
            }
          },
        },
      ],
    );
  }

  async function handleDecline(req: BookingRequest) {
    Alert.alert(
      'Decline request?',
      `Decline the ${req.requestType} request from ${req.requesterName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineBookingRequest(req.id, performerName);
              setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'declined' } : r));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not decline request.');
            }
          },
        },
      ],
    );
  }

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Booking Requests',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary, fontWeight: '800' },
          headerTintColor: C.teal,
          headerBackTitle: 'Back',
        }}
      />

      {loading ? (
        <ActivityIndicator color={C.teal} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />
          }
        >
          {requests.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📬</Text>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '800' }}>No requests yet</Text>
              <Text style={{ color: C.textMuted, marginTop: 6, textAlign: 'center' }}>
                Booking and commission requests from hosts{'\n'}will appear here.
              </Text>
            </View>
          ) : (
            <>
              {pending.length > 0 && (
                <>
                  <Text style={{
                    color: C.textMuted, fontSize: 11, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
                  }}>
                    Pending · {pending.length}
                  </Text>
                  {pending.map(r => (
                    <RequestCard
                      key={r.id}
                      req={r}
                      onAccept={() => handleAccept(r)}
                      onDecline={() => handleDecline(r)}
                    />
                  ))}
                  {resolved.length > 0 && <View style={{ height: 12 }} />}
                </>
              )}

              {resolved.length > 0 && (
                <>
                  <Text style={{
                    color: C.textMuted, fontSize: 11, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
                  }}>
                    Resolved · {resolved.length}
                  </Text>
                  {resolved.map(r => (
                    <RequestCard
                      key={r.id}
                      req={r}
                      onAccept={() => {}}
                      onDecline={() => {}}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
