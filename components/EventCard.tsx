// components/EventCard.tsx
// Accepts EventRecord from eventsStore (Supabase shape).
import { View, Text, Image } from 'react-native';
import type { EventRecord } from '../lib/eventsStore';
import { colors } from '../src/theme/colors';

const GOLD = '#F59E0B';
const GOLD_LIGHT = '#FDE68A';

export function EventCard({ event }: { event: EventRecord }) {
  const promoted = !!event.isPromoted;
  const price = event.ticketing?.price ?? 0;
  const venueName = event.venue?.name ?? '';
  const city = event.venue?.city ?? '';
  const state = event.venue?.state ?? '';
  const location = [city, state].filter(Boolean).join(', ');
  const dateStr = event.datetimeStart
    ? new Date(event.datetimeStart).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '';

  return (
    <View
      style={{
        backgroundColor: colors.navy,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: promoted ? 2 : 1,
        borderColor: promoted ? GOLD : colors.border,
        shadowColor: promoted ? GOLD : '#000',
        shadowOpacity: promoted ? 0.35 : 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 180 }} />
      ) : (
        <View style={{ width: '100%', height: 180, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 48 }}>🎭</Text>
        </View>
      )}

      {/* Promoted badge — top left */}
      {promoted && (
        <View style={{
          position: 'absolute', top: 12, left: 12,
          backgroundColor: GOLD,
          borderRadius: 7,
          paddingVertical: 4, paddingHorizontal: 9,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
          <Text style={{ fontSize: 10, lineHeight: 14 }}>✦</Text>
          <Text style={{ color: '#1C1917', fontWeight: '900', fontSize: 11, letterSpacing: 0.4 }}>
            PROMOTED
          </Text>
        </View>
      )}

      {/* Price badge — top right */}
      <View style={{
        position: 'absolute', top: 12, right: 12,
        backgroundColor: promoted ? GOLD : colors.teal,
        borderRadius: 8,
        paddingVertical: 4, paddingHorizontal: 10,
      }}>
        <Text style={{ color: promoted ? '#1C1917' : colors.offWhite, fontWeight: '800', fontSize: 13 }}>
          {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
        </Text>
      </View>

      <View style={{ padding: 14 }}>
        <Text style={{
          color: promoted ? GOLD_LIGHT : colors.textPrimary,
          fontSize: 20,
          fontWeight: '800',
        }}>
          {event.title}
        </Text>
        <Text style={{ color: colors.accent, marginTop: 6, fontSize: 13, fontWeight: '600' }}>
          {dateStr}{venueName ? ` · ${venueName}` : ''}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
          {event.description}
        </Text>
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: promoted ? GOLD : colors.teal, fontSize: 13, fontWeight: '700' }}>
            {location}
          </Text>
          {event.capacity != null && (
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Capacity {event.capacity}</Text>
          )}
        </View>
      </View>
    </View>
  );
}
