// app/performer/[id].tsx
import { InstagramGrid } from '@/components/InstagramGrid';
import { PrimaryButton } from '@/components/PrimaryButton';
import { performers as rawPerformers } from '@/data/events';
import { isGuest } from '@/lib/authStore';
import {
  followPerformer,
  getFollowerCount,
  isFollowing,
  unfollowPerformer,
} from '@/lib/followStore';
import { openVenmoPay } from '@/lib/venmo';
import * as Linking from 'expo-linking';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

type PerformerShape = {
  id: string;
  stageName: string;
  photoUrl?: string;
  bio?: string;
  bookingInfo?: string;
  venmoHandle?: string;
  commissionsEnabled?: boolean;
  instagramPhotos?: string[];
  socials?: { instagram?: string };
};

export default function PerformerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const performers = (rawPerformers as unknown as PerformerShape[]) || [];
  const p = performers.find((x) => x.id === id);

  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!p) return;
    setFollowing(isFollowing(p.id));
    getFollowerCount(p.id).then(setFollowerCount);
  }, [p?.id]);

  if (!p)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
        <Stack.Screen options={{ title: 'Performer' }} />
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textPrimary }}>Performer not found.</Text>
          <View style={{ height: 12 }} />
          <PrimaryButton title="Back to Discover" onPress={() => router.push('/(tabs)/discover')} />
        </View>
      </SafeAreaView>
    );

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
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowPerformer(p.id);
        setFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        await followPerformer(p.id);
        setFollowing(true);
        setFollowerCount(c => c + 1);
      }
    } catch {
      Alert.alert('Error', 'Could not update follow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  }

  const igPhotos = Array.isArray(p.instagramPhotos) ? p.instagramPhotos : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: p.stageName,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.teal,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />

      <ScrollView style={{ backgroundColor: colors.navy }} contentContainerStyle={{ paddingBottom: 32 }}>
        {p.photoUrl ? (
          <Image source={{ uri: p.photoUrl }} style={{ width: '100%', height: 280 }} />
        ) : null}

        <View style={{ padding: 16 }}>
          {/* Name + follower count + follow button */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900' }}>{p.stageName}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
              </Text>
            </View>

            <Pressable
              onPress={handleFollow}
              disabled={followLoading}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 9,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: following ? colors.teal : colors.teal,
                backgroundColor: following ? colors.teal + '22' : colors.teal,
                marginTop: 4,
              }}
            >
              <Text style={{
                color: following ? colors.teal : colors.navy,
                fontWeight: '700',
                fontSize: 14,
              }}>
                {followLoading ? '…' : following ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          </View>

          {p.bio ? (
            <Text style={{ color: colors.textSecondary, marginTop: 6, lineHeight: 22 }}>{p.bio}</Text>
          ) : null}
          {p.bookingInfo ? (
            <Text style={{ color: colors.accent, marginTop: 6, fontWeight: '600' }}>📍 {p.bookingInfo}</Text>
          ) : null}

          <View style={{ marginTop: 20, gap: 12 }}>
            <PrimaryButton
              title="Tip via Venmo"
              onPress={() => {
                if (p.venmoHandle && p.venmoHandle.trim().length > 0) {
                  openVenmoPay(p.venmoHandle, undefined, `Tip-${p.id}`);
                } else {
                  Alert.alert('Unavailable', 'This performer has not added a Venmo handle yet.');
                }
              }}
            />
            <PrimaryButton
              title="Request Booking"
              variant="ghost"
              onPress={() => router.push(`/performer/${p.id}/book`)}
            />
            {p.commissionsEnabled ? (
              <PrimaryButton
                title="Request Commission"
                variant="ghost"
                onPress={() => router.push(`/performer/${p.id}/book?type=commission`)}
              />
            ) : null}
          </View>

          {/* Instagram grid */}
          <View style={{ marginTop: 28 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 10 }}>
              Instagram
            </Text>
            <InstagramGrid photos={igPhotos} profileUrl={p.socials?.instagram} />
            {p.socials?.instagram ? (
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Open Instagram Profile"
                  variant="ghost"
                  onPress={() => {
                    const url = p.socials?.instagram;
                    if (url) Linking.openURL(url).catch(() => {});
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
