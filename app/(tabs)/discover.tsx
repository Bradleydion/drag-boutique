// app/(tabs)/discover.tsx
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventCard } from '@/components/EventCard';
import { events, performers, type Event } from '@/data/events';
import { getFollowedIds } from '@/lib/followStore';
import { colors } from '../../src/theme/colors';

// ─── Filter types ─────────────────────────────────────────────────────────────

type DateFilter = 'all' | 'this-week' | 'this-month';
type SortBy = 'date' | 'price-asc' | 'price-desc';

// ─── Derived city list ────────────────────────────────────────────────────────

const ALL_CITIES = ['All Cities', ...Array.from(new Set(events.map(e => e.city))).sort()];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function filterAndSort(
  query: string,
  city: string,
  dateFilter: DateFilter,
  sortBy: SortBy,
): Event[] {
  const now = Date.now();
  const todayStart = startOfDay(new Date());
  const weekEnd = todayStart + 7 * 86_400_000;
  const monthEnd = todayStart + 30 * 86_400_000;
  const q = query.toLowerCase().trim();

  return events
    .filter(e => {
      // Only show upcoming events
      if (new Date(e.dateTimeStart).getTime() < now) return false;

      // Keyword search
      if (q && ![e.title, e.venueName, e.city, e.description].some(f => f.toLowerCase().includes(q))) {
        return false;
      }

      // City filter
      if (city !== 'All Cities' && e.city !== city) return false;

      // Date filter
      const t = new Date(e.dateTimeStart).getTime();
      if (dateFilter === 'this-week' && t > weekEnd) return false;
      if (dateFilter === 'this-month' && t > monthEnd) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return new Date(a.dateTimeStart).getTime() - new Date(b.dateTimeStart).getTime();
    });
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: active ? colors.teal : colors.border,
        backgroundColor: active ? colors.teal + '22' : colors.surface,
        marginRight: 8,
        marginVertical: 4,
        alignSelf: 'center',
      }}
    >
      <Text style={{ color: active ? colors.teal : colors.textSecondary, fontWeight: active ? '700' : '400', fontSize: 13, lineHeight: 18 }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Discover() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All Cities');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');

  const results = useMemo(
    () => filterAndSort(query, city, dateFilter, sortBy),
    [query, city, dateFilter, sortBy],
  );

  // Events from artists the user follows — shown in a carousel above the main list.
  const followedEvents = useMemo(() => {
    const followedIds = getFollowedIds();
    if (followedIds.length === 0) return [];
    const now = Date.now();
    return events
      .filter(e =>
        new Date(e.dateTimeStart).getTime() > now &&
        e.performerIds.some(pid => followedIds.includes(pid)),
      )
      .sort((a, b) => new Date(a.dateTimeStart).getTime() - new Date(b.dateTimeStart).getTime())
      .slice(0, 10);
  }, []);

  const activeFilterCount = [
    city !== 'All Cities',
    dateFilter !== 'all',
    sortBy !== 'date',
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }} edges={['left', 'right', 'bottom']}>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
          gap: 8,
        }}>
          <Text style={{ fontSize: 16, color: colors.textMuted }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search events, venues, cities…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: 15,
              paddingVertical: 11,
            }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={{ color: colors.textMuted, fontSize: 18, lineHeight: 22 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Row 1: City filter ────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexShrink: 0, height: 48 }}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
      >
        {ALL_CITIES.map(c => (
          <Pill key={c} label={c} active={city === c} onPress={() => setCity(c)} />
        ))}
      </ScrollView>

      {/* ── Row 2: Date + Sort ────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexShrink: 0, height: 52, marginBottom: 4 }}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
      >
        {([
          ['all', 'Any Date'],
          ['this-week', 'This Week'],
          ['this-month', 'This Month'],
        ] as [DateFilter, string][]).map(([val, label]) => (
          <Pill key={val} label={label} active={dateFilter === val} onPress={() => setDateFilter(val)} />
        ))}

        <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 8 }} />

        {([
          ['date', 'Soonest'],
          ['price-asc', 'Price ↑'],
          ['price-desc', 'Price ↓'],
        ] as [SortBy, string][]).map(([val, label]) => (
          <Pill key={val} label={label} active={sortBy === val} onPress={() => setSortBy(val)} />
        ))}
      </ScrollView>

      {/* ── Following feed ────────────────────────────────────────────────── */}
      {followedEvents.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 10 }}>
            FROM ARTISTS YOU FOLLOW
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {followedEvents.map(event => {
              // Find the first followed performer on this event for the avatar
              const followedIds = getFollowedIds();
              const featuredPerformer = performers.find(
                p => event.performerIds.includes(p.id) && followedIds.includes(p.id),
              );
              return (
                <Link key={event.id} href={`/event/${event.id}`} asChild>
                  <Pressable style={{
                    width: 200,
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: colors.teal + '44',
                  }}>
                    <Image
                      source={{ uri: event.imageUrl }}
                      style={{ width: '100%', height: 100 }}
                    />
                    <View style={{ padding: 10 }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                        {event.title}
                      </Text>
                      {featuredPerformer && (
                        <Text style={{ color: colors.teal, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {featuredPerformer.stageName}
                        </Text>
                      )}
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 3 }}>
                        {new Date(event.dateTimeStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {event.city}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })}
          </ScrollView>
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, marginTop: 14 }} />
        </View>
      )}

      {/* ── Results header ────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {results.length === 0
            ? 'No events found'
            : `${results.length} event${results.length === 1 ? '' : 's'}`}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : ''}
        </Text>
        {activeFilterCount > 0 && (
          <Pressable onPress={() => { setCity('All Cities'); setDateFilter('all'); setSortBy('date'); setQuery(''); }}>
            <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '700' }}>Clear all</Text>
          </Pressable>
        )}
      </View>

      {/* ── Event list ────────────────────────────────────────────────────── */}
      {results.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🔎</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
            No events found
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Try a different search term or clear your filters to see all upcoming events.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={e => e.id}
          renderItem={({ item }) => (
            <Link href={`/event/${item.id}`} asChild>
              <Pressable style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <EventCard event={item} />
              </Pressable>
            </Link>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

    </SafeAreaView>
  );
}
