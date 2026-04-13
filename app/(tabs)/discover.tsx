// app/(tabs)/discover.tsx
import { Link } from 'expo-router';
import { FlatList, View, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { events } from '@/data/events';
import { EventCard } from '@/components/EventCard';
import { colors } from '../../src/theme/colors';

export default function Discover() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }} edges={['left', 'right', 'bottom']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
          Find local shows & support artists
        </Text>
      </View>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Link href={`/event/${item.id}`} asChild>
            <Pressable style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <EventCard event={item} />
            </Pressable>
          </Link>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}