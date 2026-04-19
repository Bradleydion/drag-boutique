// app/performer/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { isGuest, getSession } from '@/lib/authStore';
import {
  fetchPerformerById,
  fetchPerformerUpcomingShows,
  type PerformerRecord,
  type UpcomingShow,
} from '@/lib/performerStore';
import {
  followPerformer,
  getFollowerCount,
  isFollowing,
  unfollowPerformer,
} from '@/lib/followStore';
import { openVenmoPay } from '@/lib/venmo';
import * as Linking from 'expo-linking';
import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShowDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return iso; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PerformerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [performer, setPerformer]     = useState<PerformerRecord | null>(null);
  const [loading, setLoading]         = useState(true);
  const [following, setFollowing]     = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [upcomingShows, setUpcomingShows] = useState<UpcomingShow[]>([]);

  const currentUserId = getSession()?.user?.id;
  const isOwner = !!performer?.userId && performer.userId === currentUserId;

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      fetchPerformerById(id),
      getFollowerCount(id),
      fetchPerformerUpcomingShows(id),
    ]).then(([p, count, shows]) => {
      setPerformer(p);
      setFollowing(isFollowing(id));
      setFollowerCount(count);
      setUpcomingShows(shows);
      setLoading(false);
    });
  }, [id]);

  // ── Follow / unfollow ──────────────────────────────────────────────────────

  async function handleFollow() {
    if (isGuest()) {
      Alert.alert(
        'Create an Account',
        'You need an account to follow artists.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/auth') },
        ],
      );
      return;
    }
    if (!performer) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowPerformer(performer.id);
        setFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        await followPerformer(performer.id);
        setFollowing(true);
        setFollowerCount(c => c + 1);
      }
    } catch {
      Alert.alert('Error', 'Could not update follow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  }

  // ── Loading / not found ────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
        <Stack.Screen options={{ title: 'Artist', headerBackTitle: 'Back', headerStyle: { backgroundColor: colors.navy }, headerTintColor: colors.teal, headerTitleStyle: { color: colors.textPrimary } }} />
        <ActivityIndicator color={colors.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!performer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
        <Stack.Screen options={{ title: 'Artist', headerBackTitle: 'Back', headerStyle: { backgroundColor: colors.navy }, headerTintColor: colors.teal, headerTitleStyle: { color: colors.textPrimary } }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Artist not found.</Text>
          <View style={{ height: 16 }} />
          <PrimaryButton title="Back to Discover" onPress={() => router.push('/(tabs)/discover')} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  const p = performer;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: p.stageName,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.teal,
          headerTitleStyle: { color: colors.textPrimary },
          headerRight: isOwner
            ? () => (
                <Pressable
                  onPress={() => router.push(`/performer/${p.id}/edit` as any)}
                  hitSlop={10}
                  style={{ marginRight: 4 }}
                >
                  <Text style={{ color: colors.teal, fontSize: 15, fontWeight: '700' }}>Edit</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      <ScrollView style={{ backgroundColor: colors.navy }} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Hero photo ────────────────────────────────────────────────── */}
        {p.photoUrl ? (
          <Image
            source={{ uri: p.photoUrl }}
            style={{ width: '100%', height: 300 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: '100%', height: 200, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 64 }}>💃</Text>
          </View>
        )}

        <View style={{ padding: 16 }}>

          {/* ── Name + followers + follow button ──────────────────────── */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900' }}>
                {p.stageName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
              </Text>
            </View>

            {!isOwner && (
              <Pressable
                onPress={handleFollow}
                disabled={followLoading}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 9,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: colors.teal,
                  backgroundColor: following ? colors.teal + '22' : colors.teal,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: following ? colors.teal : colors.navy, fontWeight: '700', fontSize: 14 }}>
                  {followLoading ? '…' : following ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Bio ────────────────────────────────────────────────────── */}
          {p.bio ? (
            <Text style={{ color: colors.textSecondary, marginTop: 4, lineHeight: 22, fontSize: 15 }}>
              {p.bio}
            </Text>
          ) : null}

          {p.bookingInfo ? (
            <Text style={{ color: colors.accent, marginTop: 8, fontWeight: '600', fontSize: 14 }}>
              📍 {p.bookingInfo}
            </Text>
          ) : null}

          {/* ── Social links ───────────────────────────────────────────── */}
          {(p.instagramUrl || p.tiktokUrl || p.websiteUrl) && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              {p.instagramUrl && (
                <Pressable
                  onPress={() => Linking.openURL(p.instagramUrl!).catch(() => {})}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border }}
                >
                  <Ionicons name="logo-instagram" size={16} color="#E1306C" />
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>Instagram</Text>
                </Pressable>
              )}
              {p.tiktokUrl && (
                <Pressable
                  onPress={() => Linking.openURL(p.tiktokUrl!).catch(() => {})}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border }}
                >
                  <Ionicons name="logo-tiktok" size={16} color={colors.textPrimary} />
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>TikTok</Text>
                </Pressable>
              )}
              {p.websiteUrl && (
                <Pressable
                  onPress={() => Linking.openURL(p.websiteUrl!).catch(() => {})}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border }}
                >
                  <Ionicons name="globe-outline" size={16} color={colors.teal} />
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>Website</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ── Action buttons ─────────────────────────────────────────── */}
          {!isOwner && (
            <View style={{ marginTop: 20, gap: 10 }}>
              {p.venmoHandle ? (
                <PrimaryButton
                  title="💸 Tip via Venmo"
                  onPress={() => openVenmoPay(p.venmoHandle!, undefined, `Tip-${p.id}`)}
                />
              ) : null}
              <PrimaryButton
                title="Request Booking"
                variant="ghost"
                onPress={() => router.push(`/performer/${p.id}/book` as any)}
              />
              {p.commissionsEnabled && (
                <PrimaryButton
                  title="Request Commission"
                  variant="ghost"
                  onPress={() => router.push((`/performer/${p.id}/book?type=commission`) as any)}
                />
              )}
            </View>
          )}

          {isOwner && (
            <View style={{ marginTop: 20, gap: 10 }}>
              <PrimaryButton
                title="✏️ Edit My Profile"
                onPress={() => router.push(`/performer/${p.id}/edit` as any)}
              />
            </View>
          )}

          {/* ── Commissions info ───────────────────────────────────────── */}
          {p.commissionsEnabled && (p.commissionBlurb || p.commissionPricing) && (
            <View style={{ marginTop: 24, backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                Commissions Open
              </Text>
              {p.commissionBlurb ? (
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{p.commissionBlurb}</Text>
              ) : null}
              {p.commissionPricing ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{p.commissionPricing}</Text>
              ) : null}
            </View>
          )}

          {/* ── Upcoming shows ─────────────────────────────────────────── */}
          {upcomingShows.length > 0 && (
            <View style={{ marginTop: 28 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Upcoming Shows
              </Text>
              <View style={{ gap: 10 }}>
                {upcomingShows.map(show => (
                  <Link key={show.id} href={`/event/${show.id}` as any} asChild>
                    <Pressable style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                      {show.imageUrl && (
                        <Image source={{ uri: show.imageUrl }} style={{ width: 72, height: 72 }} resizeMode="cover" />
                      )}
                      <View style={{ flex: 1, padding: 12 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                          {show.title}
                        </Text>
                        <Text style={{ color: colors.accent, fontSize: 12, marginTop: 2 }}>
                          {formatShowDate(show.datetimeStart)}
                        </Text>
                        {show.venueName && (
                          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                            {show.venueName}{show.venueCity ? ` · ${show.venueCity}` : ''}
                          </Text>
                        )}
                      </View>
                      <View style={{ paddingRight: 12 }}>
                        <Text style={{ color: colors.teal, fontWeight: '800', fontSize: 13 }}>
                          {show.price === 0 ? 'Free' : `$${show.price}`}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
