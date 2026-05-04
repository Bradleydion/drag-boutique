// app/(tabs)/organize.tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRole } from '../../lib/userStore';
import { loadHostEvents, getHostEvents, deleteEvent, EventRecord } from '../../lib/eventsStore';
import { colors } from '../../src/theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return 'Date TBD';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}

function isUpcoming(e: EventRecord) {
  if (!e.datetimeStart) return true;
  return new Date(e.datetimeStart) >= new Date();
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, onDelete }: { event: EventRecord; onDelete: () => void; }) {
  const upcoming = isUpcoming(event);
  const price = event.ticketing?.price;

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    }}>
      {/* Status badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <View style={{
          backgroundColor: upcoming ? colors.teal + '22' : colors.border,
          borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{
            color: upcoming ? colors.teal : colors.textMuted,
            fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6,
          }}>
            {upcoming ? 'Upcoming' : 'Past'}
          </Text>
        </View>
        {typeof price === 'number' && (
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {price === 0 ? 'Free' : `$${price} tickets`}
          </Text>
        )}
      </View>

      {/* Title */}
      <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16, marginBottom: 4 }}>
        {event.title}
      </Text>

      {/* Date + Venue */}
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 2 }}>
        📅 {formatDate(event.datetimeStart)}
      </Text>
      {event.venue?.name && (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          📍 {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ''}
        </Text>
      )}

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        {upcoming && (
          <Pressable
            onPress={() => router.push(`/event/${event.id}/checkin` as any)}
            style={{
              flex: 1,
              backgroundColor: colors.coral,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.offWhite, fontWeight: '800', fontSize: 13 }}>
              🚪 Door Check-In
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push(`/event/${event.id}/edit` as any)}
          style={{
            flex: 1,
            backgroundColor: colors.teal + '22',
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.teal + '55',
          }}
        >
          <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 13 }}>✏️ Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/event/${event.id}` as any)}
          style={{
            flex: 1,
            backgroundColor: colors.border,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>View</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={{
            backgroundColor: colors.danger + '22',
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrganizeTab() {
  const role = getRole();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHostEvents().then(() => {
        setEvents(getHostEvents());
        setLoading(false);
      });
    }, []),
  );

  async function handleDelete(event: EventRecord) {
    try {
      await deleteEvent(event.id);
      setEvents(getHostEvents());
    } catch {
      // silently ignore for now
    }
  }

  // Non-host: just show the create event prompt
  if (role !== 'host') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
        <View style={{ padding: 28, alignItems: 'center', marginTop: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🎭</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
            Host-only feature
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            Switch to the Host role to create and manage events.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const upcoming = events.filter(isUpcoming);
  const past     = events.filter(e => !isUpcoming(e));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }} edges={['left', 'right', 'bottom']}>

      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '900' }}>My Events</Text>
        <Pressable
          onPress={() => router.push('/event/create/basics')}
          style={{
            backgroundColor: colors.coral,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 9,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ color: colors.offWhite, fontWeight: '800', fontSize: 14 }}>✦ New Event</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 60 }} />
      ) : events.length === 0 ? (
        // Empty state
        <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🎪</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
            No events yet
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            Create your first event and sell tickets directly through Sequins.
          </Text>
          <Pressable
            onPress={() => router.push('/event/create/basics')}
            style={{
              backgroundColor: colors.coral,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 28,
              marginTop: 28,
            }}
          >
            <Text style={{ color: colors.offWhite, fontWeight: '800', fontSize: 16 }}>
              Create Your First Event ✦
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={[...upcoming, ...past]}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListHeaderComponent={
            upcoming.length > 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Upcoming · {upcoming.length}
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <>
              {/* Section divider between upcoming and past */}
              {index === upcoming.length && past.length > 0 && (
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 12 }}>
                  Past · {past.length}
                </Text>
              )}
              <EventCard event={item} onDelete={() => handleDelete(item)} />
            </>
          )}
        />
      )}

    </SafeAreaView>
  );
}
