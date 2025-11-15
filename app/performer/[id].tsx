// app/performer/[id].tsx
import { AdSlot } from '@/components/AdSlot';
import { InstagramGrid } from '@/components/InstagramGrid';
import { PrimaryButton } from '@/components/PrimaryButton';
import { performers as rawPerformers } from '@/data/events';
import { openVenmoPay } from '@/lib/venmo';
import * as Linking from 'expo-linking';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = { bg: '#FFEB99', text: '#000000', sub: '#333333', muted: '#555555' };

// Minimal shape used here to make TS happy even if the data module lacks types
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
  const userId = 'demoUser';

  if (!p)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack.Screen options={{ title: 'Performer' }} />
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text }}>Performer not found.</Text>
          <View style={{ height: 12 }} />
          <PrimaryButton title="Back to Discover" onPress={() => router.push('/(tabs)/discover')} />
        </View>
      </SafeAreaView>
    );

  const igPhotos = Array.isArray(p.instagramPhotos) ? p.instagramPhotos : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: p.stageName,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      />

      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
        {p.photoUrl ? (
          <Image source={{ uri: p.photoUrl }} style={{ width: '100%', height: 280 }} />
        ) : null}

        <View style={{ padding: 16, backgroundColor: colors.bg }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{p.stageName}</Text>
          {p.bio ? <Text style={{ color: colors.muted, marginTop: 6 }}>{p.bio}</Text> : null}
          {p.bookingInfo ? <Text style={{ color: colors.sub, marginTop: 6 }}>Booking: {p.bookingInfo}</Text> : null}

          {/* Actions (no rowGap; RN style types don't include it) */}
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              title="Tip via Venmo"
              onPress={() => {
                if (p.venmoHandle && p.venmoHandle.trim().length > 0) {
                  openVenmoPay(p.venmoHandle, undefined, `Tip-${p.id}-${userId}`);
                } else {
                  Alert.alert('Unavailable', 'This performer has not added a Venmo handle yet.');
                }
              }}
            />
            <View style={{ height: 12 }} />
            <PrimaryButton title="Request Booking" onPress={() => router.push(`/performer/${p.id}/book`)} />
            {p.commissionsEnabled ? (
              <>
                <View style={{ height: 12 }} />
                <PrimaryButton
                  title="Request Commission"
                  onPress={() => router.push(`/performer/${p.id}/book?type=commission`)}
                />
              </>
            ) : null}
            <View style={{ height: 12 }} />
            <PrimaryButton title="Back to Discover" onPress={() => router.push('/(tabs)/discover')} />
          </View>

          {/* Instagram grid */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Instagram</Text>
            <InstagramGrid photos={igPhotos} profileUrl={p.socials?.instagram} />
            {p.socials?.instagram ? (
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Open Instagram Profile"
                  onPress={() => {
                    const url = p.socials?.instagram;
                    if (url) Linking.openURL(url).catch(() => {});
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>

        <AdSlot slot="performer" />
      </ScrollView>
    </SafeAreaView>
  );
}