// components/EventCard.tsx
import { View, Text, Image } from 'react-native';
import type { Event } from '@/data/events';
import { colors } from '../src/theme/colors';

export function EventCard({ event }: { event: Event }) {
  return (
    <View
      style={{
        backgroundColor: colors.navy,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 180 }} />

      {/* Price badge */}
      <View style={{
        position: 'absolute', top: 12, right: 12,
        backgroundColor: colors.teal,
        borderRadius: 8,
        paddingVertical: 4, paddingHorizontal: 10,
      }}>
        <Text style={{ color: colors.offWhite, fontWeight: '800', fontSize: 13 }}>
          ${event.price.toFixed(2)}
        </Text>
      </View>

      <View style={{ padding: 14 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800' }}>{event.title}</Text>
        <Text style={{ color: colors.accent, marginTop: 6, fontSize: 13, fontWeight: '600' }}>
          {new Date(event.dateTimeStart).toLocaleString()} • {event.venueName}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
          {event.description}
        </Text>
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '700' }}>{event.city}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Capacity {event.capacity}</Text>
        </View>
      </View>
    </View>
  );
}