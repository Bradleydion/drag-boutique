// app/(tabs)/discover.tsx
// Live event feed from Supabase — promoted events float first,
// city filter derived from real data, following feed wired to performer IDs.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventCard } from '@/components/EventCard';
import { loadEvents, type EventRecord } from '@/lib/eventsStore';
import { getFollowedIds } from '@/lib/followStore';
import { loadPerformers, getPerformers, type PerformerRecord } from '@/lib/performerStore';
import { roleEmoji, roleLabel } from '@/lib/eventRolesStore';
import { isGuest } from '@/lib/authStore';
import { getRole } from '@/lib/userStore';
import { colors } from '../../src/theme/colors';

const FAN_NUDGE_KEY = '@sequins/fanNudgeDismissed';

type DiscoverMode = 'events' | 'talent' | 'both';

// ─── Filter types ─────────────────────────────────────────────────────────────

type DateFilter = 'all' | 'this-week' | 'this-month';
type SortBy     = 'date' | 'price-asc' | 'price-desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function filterAndSort(
  allEvents: EventRecord[],
  query: string,
  city: string,
  dateFilter: DateFilter,
  sortBy: SortBy,
): EventRecord[] {
  const now = Date.now();
  const todayStart = startOfDay(new Date());
  const weekEnd  = todayStart + 7  * 86_400_000;
  const monthEnd = todayStart + 30 * 86_400_000;
  const q = query.toLowerCase().trim();

  const filtered = allEvents.filter(e => {
    if (!e.datetimeStart || new Date(e.datetimeStart).getTime() < now) return false;

    if (q) {
      const haystack = [
        e.title,
        e.venue?.name,
        e.venue?.city,
        e.venue?.state,
        e.description,
        e.hostName,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (city !== 'All Cities') {
      const evCity = [e.venue?.city, e.venue?.state].filter(Boolean).join(', ');
      if (evCity !== city) return false;
    }

    const t = new Date(e.datetimeStart).getTime();
    if (dateFilter === 'this-week'  && t > weekEnd)  return false;
    if (dateFilter === 'this-month' && t > monthEnd) return false;

    return true;
  });

  // Promoted always float to top; within each group apply user's sort
  return filtered.sort((a, b) => {
    if (a.isPromoted && !b.isPromoted) return -1;
    if (!a.isPromoted && b.isPromoted) return 1;
    if (sortBy === 'price-asc')  return (a.ticketing?.price ?? 0) - (b.ticketing?.price ?? 0);
    if (sortBy === 'price-desc') return (b.ticketing?.price ?? 0) - (a.ticketing?.price ?? 0);
    return new Date(a.datetimeStart!).getTime() - new Date(b.datetimeStart!).getTime();
  });
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1,
        borderColor: active ? colors.teal : colors.border,
        backgroundColor: active ? colors.teal + '22' : colors.surface,
        marginRight: 8, marginVertical: 4, alignSelf: 'center',
      }}
    >
      <Text style={{
        color: active ? colors.teal : colors.textSecondary,
        fontWeight: active ? '700' : '400',
        fontSize: 13, lineHeight: 18,
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Discover() {
  const [allEvents, setAllEvents]   = useState<EventRecord[]>([]);
  const [allTalent, setAllTalent]   = useState<PerformerRecord[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode,      setMode]        = useState<DiscoverMode>('events');

  const [query,      setQuery]      = useState('');
  const [city,       setCity]       = useState('All Cities');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortBy,     setSortBy]     = useState<SortBy>('date');

  // Fan profile nudge — start as true (hidden) to avoid a flash before AsyncStorage loads.
  const [nudgeDismissed, setNudgeDismissed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(FAN_NUDGE_KEY).then(val => {
      setNudgeDismissed(val === 'true');
    });
  }, []);

  async function dismissNudge() {
    setNudgeDismissed(true);
    await AsyncStorage.setItem(FAN_NUDGE_KEY, 'true');
  }

  async function fetchAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [evData] = await Promise.all([
      loadEvents(),
      loadPerformers(),
    ]);
    setAllEvents(evData);
    setAllTalent(getPerformers());
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }

  // Reload whenever tab comes into focus
  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  // Derive city list from live events
  const cityOptions = useMemo(() => {
    const cities = Array.from(new Set(
      allEvents
        .map(e => [e.venue?.city, e.venue?.state].filter(Boolean).join(', '))
        .filter(Boolean),
    )).sort();
    return ['All Cities', ...cities];
  }, [allEvents]);

  // Following feed — events where any followed performer is tagged
  const followedEvents = useMemo(() => {
    const followedIds = getFollowedIds();
    if (followedIds.length === 0) return [];
    const now = Date.now();
    return allEvents
      .filter(e =>
        e.datetimeStart &&
        new Date(e.datetimeStart).getTime() > now &&
        (e.performerIds ?? []).some(pid => followedIds.includes(pid)),
      )
      .slice(0, 10);
  }, [allEvents]);

  const results = useMemo(
    () => filterAndSort(allEvents, query, city, dateFilter, sortBy),
    [allEvents, query, city, dateFilter, sortBy],
  );

  const talentResults = useMemo(() => {
    const q = query.toLowerCase();
    return allTalent.filter(p => {
      if (q && !p.stageName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allTalent, query]);

  const activeFilterCount = [
    city !== 'All Cities',
    dateFilter !== 'all',
    sortBy !== 'date',
  ].filter(Boolean).length;

  const showEvents = mode === 'events' || mode === 'both';
  const showTalent = mode === 'talent' || mode === 'both';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }} edges={['left', 'right', 'bottom']}>

      {/* ── Fan profile nudge ────────────────────────────────────────────── */}
      {getRole() === 'fan' && !isGuest() && !nudgeDismissed && (
        <View style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 2,
          backgroundColor: colors.teal + '18',
          borderRadius: 14,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderWidth: 1,
          borderColor: colors.teal + '55',
          gap: 12,
        }}>
          <Text style={{ fontSize: 22, lineHeight: 28 }}>✦</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.teal, fontWeight: '800', fontSize: 14, marginBottom: 3 }}>
              Complete your profile
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>
              Add your name, save payment info for easy checkout, and share a bit about yourself.
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/profile')} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 13 }}>
                Set up your profile →
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={dismissNudge} hitSlop={10} style={{ paddingTop: 2 }}>
            <Text style={{ color: colors.textMuted, fontSize: 18, lineHeight: 22 }}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* ── Mode toggle ───────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 }}>
        {(['events', 'talent', 'both'] as DiscoverMode[]).map(m => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: mode === m ? colors.teal : colors.surface,
              borderWidth: 1,
              borderColor: mode === m ? colors.teal : colors.border,
            }}
          >
            <Text style={{
              color: mode === m ? colors.navy : colors.textMuted,
              fontWeight: '800',
              fontSize: 13,
              textTransform: 'capitalize',
            }}>{m === 'both' ? 'Both' : m === 'events' ? 'Events' : 'Talent'}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface, borderRadius: 12,
          borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: 12, gap: 8,
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
            style={{ flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 11 }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={{ color: colors.textMuted, fontSize: 18, lineHeight: 22 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── City pills ────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={{ flexShrink: 0, height: 48 }}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
      >
        {cityOptions.map(c => (
          <Pill key={c} label={c} active={city === c} onPress={() => setCity(c)} />
        ))}
      </ScrollView>

      {/* ── Date + Sort pills ─────────────────────────────────────────────── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={{ flexShrink: 0, height: 52, marginBottom: 4 }}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
      >
        {([
          ['all',        'Any Date'],
          ['this-week',  'This Week'],
          ['this-month', 'This Month'],
        ] as [DateFilter, string][]).map(([val, label]) => (
          <Pill key={val} label={label} active={dateFilter === val} onPress={() => setDateFilter(val)} />
        ))}

        <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 8 }} />

        {([
          ['date',       'Soonest'],
          ['price-asc',  'Price ↑'],
          ['price-desc', 'Price ↓'],
        ] as [SortBy, string][]).map(([val, label]) => (
          <Pill key={val} label={label} active={sortBy === val} onPress={() => setSortBy(val)} />
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 14 }}>Finding shows near you…</Text>
        </View>
      ) : (
        <FlatList
          data={showTalent && !showEvents ? talentResults : showTalent ? [...results.map(e => ({ _type: 'event' as const, data: e })), ...talentResults.map(t => ({ _type: 'talent' as const, data: t }))] : results.map(e => ({ _type: 'event' as const, data: e }))}
          keyExtractor={(item: any) => item._type ? `${item._type}-${item.data.id}` : item.id}
          ListHeaderComponent={showEvents && !showTalent ? (
            <View>
              {/* Following feed */}
              {followedEvents.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', paddingHorizontal: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Following
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}>
                    {followedEvents.map(event => (
                      <Link key={event.id} href={`/event/${event.id}`} asChild>
                        <Pressable style={{ width: 240 }}><EventCard event={event} compact /></Pressable>
                      </Link>
                    ))}
                  </ScrollView>
                </View>
              )}
              {/* Results header */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  {results.length === 0 ? 'No events found' : `${results.length} event${results.length === 1 ? '' : 's'}`}
                  {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : ''}
                </Text>
                {activeFilterCount > 0 && (
                  <Pressable onPress={() => { setCity('All Cities'); setDateFilter('all'); setSortBy('date'); setQuery(''); }}>
                    <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '700' }}>Clear all</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : showTalent && !showEvents ? (
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', paddingHorizontal: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {talentResults.length} talent
            </Text>
          ) : null}
          renderItem={({ item }: any) => {
            // Mixed mode: item has _type
            if (item._type === 'talent' || (!item._type && showTalent && !showEvents)) {
              const p: PerformerRecord = item._type ? item.data : item;
              return (
                <Link href={`/performer/${p.id}`} asChild>
                  <Pressable style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, gap: 12 }}>
                    {p.photoUrl ? (
                      <Image source={{ uri: p.photoUrl }} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: p.isPromoted ? 2 : 0, borderColor: '#F59E0B' }} />
                    ) : (
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 24 }}>💃</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: p.isPromoted ? '#F59E0B' : colors.textPrimary, fontWeight: '800', fontSize: 15 }}>{p.stageName}</Text>
                      {p.bookingInfo ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{p.bookingInfo}</Text> : null}
                    </View>
                    <Text style={{ color: colors.teal, fontSize: 22 }}>›</Text>
                  </Pressable>
                </Link>
              );
            }
            // Event
            const e: EventRecord = item._type ? item.data : item;
            return (
              <Link href={`/event/${e.id}`} asChild>
                <Pressable style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                  <EventCard event={e} />
                </Pressable>
              </Link>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(true)}
              tintColor={colors.teal}
            />
          }
        />
      )}

    </SafeAreaView>
  );
}
