// app/(tabs)/discover.tsx
import { Link } from 'expo-router';
import { FlatList, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { events } from '@/data/events';
import { AdSlot } from '@/components/AdSlot';
import { EventCard } from '@/components/EventCard';
import { ThemedText } from '@/components/ThemedText';
import DevDebugBanner from "@components/DevDebugBanner";

export default function Discover() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFEB99' }}>
      <AdSlot slot="discover" />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 }}>
        <ThemedText type="title" style={{ fontSize: 28, fontWeight: '900' }}>Discover</ThemedText>
        <DevDebugBanner />
        <ThemedText type="subtitle" style={{ marginTop: 4 }}>Find local shows & support artists</ThemedText>
      </View>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Link href={`/event/${item.id}`} asChild>
            <Pressable style={{ paddingHorizontal: 16, marginBottom: 14 }}>
              <EventCard event={item} />
            </Pressable>
          </Link>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}