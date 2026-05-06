// app/performer/[id]/invites.tsx
// Event invite inbox for talent — lists pending role invites with accept/decline.
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
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
  respondToInvite,
  roleEmoji,
  roleLabel,
  type EventTalentInvite,
} from '../../../lib/eventRolesStore';
import { fetchEventById } from '../../../lib/eventsStore';
import { colors as C } from '../../../src/theme/colors';

function InviteCard({
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

export default function InvitesScreen() {
  const { id: talentId } = useLocalSearchParams<{ id: string }>();
  const [invites, setInvites]     = useState<EventTalentInvite[]>([]);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(spinner = false) {
    if (spinner) setLoading(true);
    const data = await loadMyInvites(talentId);
    setInvites(data);

    // Fetch event titles
    const titles: Record<string, string> = {};
    await Promise.all(data.map(async inv => {
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
              setInvites(prev => prev.filter(i => i.id !== inv.id));
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
              setInvites(prev => prev.filter(i => i.id !== inv.id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not decline invite.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Event Invites',
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
          {invites.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📬</Text>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '800' }}>No pending invites</Text>
              <Text style={{ color: C.textMuted, marginTop: 6, textAlign: 'center' }}>
                When a host invites you to fill a role,{'\n'}it'll appear here.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{
                color: C.textMuted, fontSize: 11, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
              }}>
                Pending · {invites.length}
              </Text>
              {invites.map(inv => (
                <InviteCard
                  key={inv.id}
                  invite={inv}
                  eventTitle={eventTitles[inv.eventId] ?? ''}
                  onAccept={() => handleAccept(inv)}
                  onDecline={() => handleDecline(inv)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
