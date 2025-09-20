// components/EventCard.tsx
import { View, Text, Image } from 'react-native';
import type { Event } from '@/data/events';

const colors = {
  bg: '#FFEB99',
  text: '#000000',
  sub: '#333333',
  muted: '#555555',
  border: '#e0c966',
};

export function EventCard({ event }: { event: Event }) {
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 180 }} />
      <View style={{ padding: 14 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{event.title}</Text>
        <Text style={{ color: colors.sub, marginTop: 6, fontSize: 14 }}>
          {new Date(event.dateTimeStart).toLocaleString()} • {event.venueName}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 8 }} numberOfLines={2}>
          {event.description}
        </Text>
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>${event.price.toFixed(2)}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Capacity {event.capacity}</Text>
        </View>
      </View>
    </View>
  );
}