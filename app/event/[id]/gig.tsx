// app/event/[id]/gig.tsx
// Talent-facing event night call sheet.
// Shown when a confirmed talent taps their gig from the invites screen.

import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchEventById, type EventRecord } from '../../../lib/eventsStore';
import { loadEventTalent, roleEmoji, roleLabel, type EventTalentInvite } from '../../../lib/eventRolesStore';
import { fetchPerformerById } from '../../../lib/performerStore';
import { colors as C } from '../../../src/theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso?: string) {
  if (!iso) return 'Date TBD';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }) + '\n' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function timeUntil(iso?: string): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Event has started';
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (days > 0)  return `${days}d ${hours}h away`;
  if (hours > 0) return `${hours}h ${mins}m away`;
  return `${mins} minutes away`;
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  Linking.openURL(`https://maps.apple.com/?q=${encoded}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`),
  );
}

// ─── Crew row (other confirmed staff) ────────────────────────────────────────

function CrewRow({ invite }: { invite: EventTalentInvite }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: C.border,
    }}>
      {invite.photoUrl ? (
        <Image source={{ uri: invite.photoUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
      ) : (
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: C.border,
        }}>
          <Text style={{ fontSize: 16 }}>{roleEmoji(invite.roleName)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 14 }}>
          {invite.stageName ?? 'Crew Member'}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>
          {roleEmoji(invite.roleName)} {invite.customRoleName || roleLabel(invite.roleName)}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GigScreen() {
  const { id: eventId, talentId } = useLocalSearchParams<{ id: string; talentId: string }>();

  const [event,       setEvent]       = useState<EventRecord | null>(null);
  const [myInvite,    setMyInvite]    = useState<EventTalentInvite | null>(null);
  const [crew,        setCrew]        = useState<EventTalentInvite[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [ev, allTalent] = await Promise.all([
        fetchEventById(eventId),
        loadEventTalent(eventId),
      ]);
      setEvent(ev);

      // Separate my invite from the rest of the crew
      const mine = allTalent.find(t => t.talentId === talentId && t.status === 'accepted');
      setMyInvite(mine ?? null);

      // Confirmed crew — exclude myself
      const otherCrew = allTalent.filter(
        t => t.status === 'accepted' && t.talentId !== talentId,
      );
      setCrew(otherCrew);

      setLoading(false);
    })();
  }, [eventId, talentId]);

  const countdown = timeUntil(event?.datetimeStart);
  const fullAddress = [
    event?.venue?.address,
    event?.venue?.city,
    event?.venue?.state,
    event?.venue?.zip,
  ].filter(Boolean).join(', ');

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <Stack.Screen options={{
          title: 'My Gig',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingRight: 16, paddingVertical: 4 }}>
              <Text style={{ color: C.teal, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
            </Pressable>
          ),
        }} />
        <ActivityIndicator color={C.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <Stack.Screen options={{ title: 'My Gig', headerStyle: { backgroundColor: C.navy }, headerTitleStyle: { color: C.textPrimary }, headerTintColor: C.teal }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
            Event not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'My Gig',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerBackTitle: 'Back',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingRight: 16, paddingVertical: 4 }}>
              <Text style={{ color: C.teal, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Hero flyer */}
        {event.imageUrl && (
          <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 18, borderWidth: 1, borderColor: C.border }}>
            <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
          </View>
        )}

        {/* Countdown pill */}
        {countdown && (
          <View style={{
            alignSelf: 'flex-start', backgroundColor: C.teal + '22',
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
            borderWidth: 1, borderColor: C.teal + '55', marginBottom: 12,
          }}>
            <Text style={{ color: C.teal, fontWeight: '800', fontSize: 13 }}>⏱ {countdown}</Text>
          </View>
        )}

        {/* Event name */}
        <Text style={{ color: C.textPrimary, fontSize: 24, fontWeight: '900', lineHeight: 30 }}>
          {event.title}
        </Text>

        {/* ── My Role card ────────────────────────────────────── */}
        <View style={{
          backgroundColor: C.surface, borderRadius: 16, padding: 16,
          marginTop: 16, borderWidth: 1.5, borderColor: C.teal + '66',
        }}>
          <Text style={sectionLabel}>Your Role</Text>
          {myInvite ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <Text style={{ fontSize: 28 }}>{roleEmoji(myInvite.roleName)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 18 }}>
                  {myInvite.customRoleName || roleLabel(myInvite.roleName)}
                </Text>
                <Text style={{ color: '#34D399', fontSize: 13, marginTop: 2, fontWeight: '700' }}>
                  ✓ Confirmed
                </Text>
              </View>
              {myInvite.payAgreed !== undefined && (
                <View style={{
                  backgroundColor: '#34D399' + '22', borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderWidth: 1, borderColor: '#34D399' + '55',
                }}>
                  <Text style={{ color: '#34D399', fontWeight: '900', fontSize: 18 }}>
                    ${myInvite.payAgreed.toFixed(0)}
                  </Text>
                  <Text style={{ color: '#34D399', fontSize: 10, textAlign: 'center' }}>agreed</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={{ color: C.textMuted, fontSize: 14, marginTop: 4 }}>
              Role details not found. Contact the host.
            </Text>
          )}
        </View>

        {/* ── Date & Time ─────────────────────────────────────── */}
        <View style={card}>
          <Text style={sectionLabel}>Date & Time</Text>
          <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: '700', lineHeight: 24, marginTop: 4 }}>
            {formatDateTime(event.datetimeStart)}
          </Text>
          {event.timezone && (
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{event.timezone}</Text>
          )}
        </View>

        {/* ── Venue ───────────────────────────────────────────── */}
        {(event.venue?.name || fullAddress) && (
          <Pressable
            onPress={() => fullAddress ? openMaps(fullAddress) : null}
            style={[card, { gap: 4 }]}
          >
            <Text style={sectionLabel}>Venue</Text>
            {event.venue?.name && (
              <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 4 }}>
                {event.venue.name}
              </Text>
            )}
            {fullAddress && (
              <Text style={{ color: C.teal, fontSize: 13, marginTop: 2 }}>
                📍 {fullAddress}
              </Text>
            )}
            {fullAddress && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                marginTop: 8, backgroundColor: C.teal + '18',
                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                alignSelf: 'flex-start',
              }}>
                <Ionicons name="navigate-outline" size={14} color={C.teal} />
                <Text style={{ color: C.teal, fontWeight: '700', fontSize: 12 }}>Open in Maps</Text>
              </View>
            )}
            {event.venue?.instagram && (
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 6 }}>
                📸 @{event.venue.instagram.replace(/^@/, '')}
              </Text>
            )}
          </Pressable>
        )}

        {/* ── Host ────────────────────────────────────────────── */}
        {event.hostName && (
          <View style={card}>
            <Text style={sectionLabel}>Host</Text>
            <Text style={{ color: C.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
              {event.hostName}
            </Text>
          </View>
        )}

        {/* ── Crew ────────────────────────────────────────────── */}
        {crew.length > 0 && (
          <View style={card}>
            <Text style={sectionLabel}>Your Crew ({crew.length})</Text>
            {crew.map(c => <CrewRow key={c.id} invite={c} />)}
          </View>
        )}

        {/* ── Description ─────────────────────────────────────── */}
        {event.description && (
          <View style={card}>
            <Text style={sectionLabel}>About This Event</Text>
            <Text style={{ color: C.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 4 }}>
              {event.description}
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const sectionLabel = {
  color: '#9CA3AF' as const,
  fontSize: 10 as const,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8 as const,
};

const card = {
  backgroundColor: C.surface,
  borderRadius: 14,
  padding: 16,
  marginTop: 12,
  borderWidth: 1,
  borderColor: C.border,
};
