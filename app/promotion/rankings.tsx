// app/promotion/rankings.tsx
// "Where do I rank" dashboard for hosts and performers -- shows real
// position in the same promoted-first order Discover shows fans, so
// "promote to jump to the top" is a verifiable claim, not just marketing
// copy. Reached from Profile.

import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRole } from '../../lib/userStore';
import { getSession } from '../../lib/authStore';
import { getHostEvents, loadHostEvents } from '../../lib/eventsStore';
import { loadMyPerformerProfile } from '../../lib/performerStore';
import {
  getHostEventRankings,
  getPerformerRanking,
  PROMOTION_PRICE_LABEL,
  PROMOTION_DAYS,
  type EventRanking,
  type PerformerRanking,
} from '../../lib/promotionStore';
import { colors as C } from '../../src/theme/colors';

const GOLD = '#F59E0B';

export default function RankingsScreen() {
  const role = getRole();
  const [loading, setLoading] = useState(true);
  const [eventRankings, setEventRankings] = useState<EventRanking[]>([]);
  const [performerId, setPerformerId] = useState<string | null>(null);
  const [performerRanking, setPerformerRanking] = useState<PerformerRanking | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      const userId = getSession()?.user?.id;

      async function run() {
        if (role === 'host' && userId) {
          await loadHostEvents();
          const rankings = await getHostEventRankings(userId);
          if (!cancelled) setEventRankings(rankings);
        } else if (role === 'artist') {
          const profile = await loadMyPerformerProfile();
          if (profile) {
            if (!cancelled) setPerformerId(profile.id);
            const ranking = await getPerformerRanking(profile.id);
            if (!cancelled) setPerformerRanking(ranking);
          }
        }
        if (!cancelled) setLoading(false);
      }
      run();
      return () => { cancelled = true; };
    }, [role]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Your Rankings',
          headerStyle: { backgroundColor: C.navy },
          headerTintColor: C.textPrimary,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {loading ? (
          <ActivityIndicator color={C.teal} style={{ marginTop: 40 }} />
        ) : role === 'host' ? (
          <HostRankings rankings={eventRankings} />
        ) : role === 'artist' ? (
          <PerformerRankingCard performerId={performerId} ranking={performerRanking} />
        ) : (
          <Text style={{ color: C.textSecondary, textAlign: 'center', marginTop: 40 }}>
            Rankings are available for hosts and performers.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ExplainerCard() {
  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: C.border, marginBottom: 20,
    }}>
      <Text style={{ color: C.textSecondary, fontSize: 13, lineHeight: 19 }}>
        This is the same order fans see in Discover: promoted listings float to
        the top first, everything else follows in date/alphabetical order.
        Promoting moves you to position #1 for {PROMOTION_DAYS} days, {PROMOTION_PRICE_LABEL} a pop.
      </Text>
    </View>
  );
}

function HostRankings({ rankings }: { rankings: EventRanking[] }) {
  if (rankings.length === 0) {
    return (
      <>
        <ExplainerCard />
        <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 20 }}>
          You don't have any upcoming events yet.
        </Text>
      </>
    );
  }

  return (
    <>
      <ExplainerCard />
      {rankings.map(r => (
        <Pressable
          key={r.eventId}
          onPress={() => router.push(`/event/${r.eventId}/edit` as any)}
          style={{
            backgroundColor: r.isPromoted ? GOLD + '14' : C.surface,
            borderRadius: 14,
            borderWidth: r.isPromoted ? 2 : 1,
            borderColor: r.isPromoted ? GOLD : C.border,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15, flex: 1 }} numberOfLines={1}>
              {r.title}
            </Text>
            <Text style={{ color: r.isPromoted ? GOLD : C.teal, fontWeight: '900', fontSize: 16 }}>
              #{r.rank}
            </Text>
          </View>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            of {r.totalUpcoming} upcoming events{r.promotedCount > 0 ? ` · ${r.promotedCount} currently promoted` : ''}
          </Text>
          {!r.isPromoted && r.rank > 1 && (
            <Text style={{ color: C.teal, fontSize: 12, fontWeight: '700', marginTop: 8 }}>
              Tap to promote and jump to #1 →
            </Text>
          )}
          {r.isPromoted && r.promotedUntil && (
            <Text style={{ color: GOLD, fontSize: 12, fontWeight: '700', marginTop: 8 }}>
              ✦ Promoted until {new Date(r.promotedUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </Pressable>
      ))}
    </>
  );
}

function PerformerRankingCard({ performerId, ranking }: { performerId: string | null; ranking: PerformerRanking | null }) {
  if (!performerId || !ranking) {
    return (
      <>
        <ExplainerCard />
        <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 20 }}>
          Set up your talent profile to see your ranking.
        </Text>
      </>
    );
  }

  return (
    <>
      <ExplainerCard />
      <Pressable
        onPress={() => router.push(`/performer/${performerId}/edit` as any)}
        style={{
          backgroundColor: ranking.isPromoted ? GOLD + '14' : C.surface,
          borderRadius: 18,
          borderWidth: ranking.isPromoted ? 2 : 1,
          borderColor: ranking.isPromoted ? GOLD : C.border,
          padding: 24,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: ranking.isPromoted ? GOLD : C.teal, fontWeight: '900', fontSize: 40 }}>
          #{ranking.rank}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
          of {ranking.totalTalent} performers in the directory
          {ranking.promotedCount > 0 ? ` · ${ranking.promotedCount} currently promoted` : ''}
        </Text>
        {ranking.isPromoted && ranking.promotedUntil ? (
          <Text style={{ color: GOLD, fontSize: 13, fontWeight: '700', marginTop: 14 }}>
            ✦ Promoted until {new Date(ranking.promotedUntil).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
          </Text>
        ) : (
          <Text style={{ color: C.teal, fontSize: 13, fontWeight: '700', marginTop: 14 }}>
            Tap to promote and jump to #1 →
          </Text>
        )}
      </Pressable>
    </>
  );
}
