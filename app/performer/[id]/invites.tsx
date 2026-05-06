// app/performer/[id]/invites.tsx
// Event invite inbox for talent — pending invites + confirmed gigs with withdraw option.
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
  loadMyInvites,
  loadMyConfirmedRoles,
  respondToInvite,
  selfRemoveFromEvent,
  roleEmoji,
  roleLabel,
  type EventTalentInvite,
} from '../../../lib/eventRolesStore';
import { fetchEventById } from '../../../lib/eventsStore';
import { colors as C } from '../../../src/theme/colors';

// ─── Pending invite card ──────────────────────────────────────────────────────

function PendingCard({
  invite,
  eventTitle,
  onAccept,
  onDecline,
}: {
  invite: EventTalentInvite;
  eventTitle: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const date = new Date(invite.invitedAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.teal + '55',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Text style={{ fontSize: 20 }}>{roleEmoji(invite.roleName)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
            {invite.customRoleName || roleLabel(invite.roleName)}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>{date}</Text>
        </View>
        {invite.payAgreed !== undefined && (
          <View style={{ backgroundColor: C.teal + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: C.teal, fontWeight: '900', fontSize: 14 }}>${invite.payAgreed}</Text>
          </View>
        )}
      </View>

      <Text style={{ color: C.textSecondary, fontSize: 14, marginBottom: 14 }} numberOfLines={2}>
        {eventTitle || 'Upcoming event'}
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onAccept}
          style={{
            flex: 1, backgroundColor: '#34D399',
            borderRadius: 10, paddingVertical: 10, alignItems: 'center',
          }}
        >
          <Text style={{ color: C.navy, fontWeight: '800', fontSize: 14 }}>✓ Accept</Text>
        </Pressable>
        <Pressable
          onPress={onDecline}
          style={{
            flex: 1, backgroundColor: C.surface,
            borderRadius: 10, paddingVertical: 10, alignItems: 'center',
            borderWidth: 1, borderColor: '#F87171',
          }}
        >
          <Text style={{ color: '#F87171', fontWeight: '800', fontSize: 14 }}>✕ Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Confirmed gig card ───────────────────────────────────────────────────────

function ConfirmedCard({
  invite,
  eventTitle,
  onWithdraw,
}: {
  invite: EventTalentInvite;
  eventTitle: string;
  onWithdraw: () => void;
}) {
  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#34D399' + '55',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 20 }}>{roleEmoji(invite.roleName)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
            {invite.customRoleName || roleLabel(invite.roleName)}
          </Text>
          <Text style={{ color: '#34D399', fontSize: 12, marginTop: 1 }}>✓ Confirmed</Text>
        </View>
        {invite.payAgreed !== undefined && (
          <View style={{ backgroundColor: '#34D399' + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#34D399' + '55' }}>
            <Text style={{ color: '#34D399', fontWeight: '900', fontSize: 14 }}>${invite.payAgreed}</Text>
          </View>
        )}
      </View>

      <Text style={{ color: C.textSecondary, fontSize: 14, marginTop: 8, marginBottom: 14 }} numberOfLines={2}>
        {eventTitle || 'Upcoming event'}
      </Text>

      <Pressable
        onPress={onWithdraw}
        style={{
          backgroundColor: C.surface, borderRadius: 10, paddingVertical: 9,
          alignItems: 'center', borderWidth: 1, borderColor: C.danger + '66',
        }}
      >
        <Text style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>Withdraw from this gig</Text>
      </Pressable>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function InvitesScreen() {
  const { id: talentId } = useLocalSearchParams<{ id: string }>();
  const [pending,    setPending]    = useState<EventTalentInvite[]>([]);
  const [confirmed,  setConfirmed]  = useState<EventTalentInvite[]>([]);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(spinner = false) {
    if (spinner) setLoading(true);
    const [pData, cData] = await Promise.all([
      loadMyInvites(talentId),
      loadMyConfirmedRoles(talentId),
    ]);
    setPending(pData);
    setConfirmed(cData);

    // Fetch event titles for all
    const all = [...pData, ...cData];
    const titles: Record<string, string> = {};
    await Promise.all(all.map(async inv => {
      if (titles[inv.eventId]) return;
      const ev = await fetchEventById(inv.eventId).catch(() => null);
      if (ev) titles[inv.eventId] = ev.title;
    }));
    setEventTitles(titles);

    if (spinner) setLoading(false);
  }

  useEffect(() => { load(true); }, [talentId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [talentId]);

  async function handleAccept(inv: EventTalentInvite) {
    Alert.alert(
      'Accept invite?',
      `Accept the ${roleLabel(inv.roleName)} role${inv.payAgreed !== undefined ? ` for $${inv.payAgreed}` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await respondToInvite(inv.id, true, inv.payAgreed ?? 0);
              // Move from pending to confirmed
              setPending(prev => prev.filter(i => i.id !== inv.id));
              setConfirmed(prev => [{ ...inv, status: 'accepted' }, ...prev]);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not accept invite.');
            }
          },
        },
      ],
    );
  }

  async function handleDecline(inv: EventTalentInvite) {
    Alert.alert(
      'Decline invite?',
      `Decline the ${roleLabel(inv.roleName)} role?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await respondToInvite(inv.id, false, 0);
              setPending(prev => prev.filter(i => i.id !== inv.id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not decline invite.');
            }
          },
        },
      ],
    );
  }

  async function handleWithdraw(inv: EventTalentInvite) {
    Alert.alert(
      'Withdraw from gig?',
      `Are you sure you want to withdraw from ${eventTitles[inv.eventId] ?? 'this event'}? The host will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await selfRemoveFromEvent(inv.id);
              setConfirmed(prev => prev.filter(i => i.id !== inv.id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not withdraw.');
            }
          },
        },
      ],
    );
  }

  const isEmpty = pending.length === 0 && confirmed.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'My Gigs & Invites',
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
          {isEmpty ? (
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📬</Text>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '800' }}>No invites yet</Text>
              <Text style={{ color: C.textMuted, marginTop: 6, textAlign: 'center' }}>
                When a host invites you to fill a role,{'\n'}it'll appear here.
              </Text>
            </View>
          ) : (
            <>
              {/* Pending invites */}
              {pending.length > 0 && (
                <>
                  <Text style={{
                    color: C.textMuted, fontSize: 11, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                  }}>
                    Pending · {pending.length}
                  </Text>
                  {pending.map(inv => (
                    <PendingCard
                      key={inv.id}
                      invite={inv}
                      eventTitle={eventTitles[inv.eventId] ?? ''}
                      onAccept={() => handleAccept(inv)}
                      onDecline={() => handleDecline(inv)}
                    />
                  ))}
                  {confirmed.length > 0 && <View style={{ height: 8 }} />}
                </>
              )}

              {/* Confirmed gigs */}
              {confirmed.length > 0 && (
                <>
                  <Text style={{
                    color: C.textMuted, fontSize: 11, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                  }}>
                    Confirmed Gigs · {confirmed.length}
                  </Text>
                  {confirmed.map(inv => (
                    <ConfirmedCard
                      key={inv.id}
                      invite={inv}
                      eventTitle={eventTitles[inv.eventId] ?? ''}
                      onWithdraw={() => handleWithdraw(inv)}
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
