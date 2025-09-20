// app/performer/[id].tsx
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { ScrollView, View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { performers } from '@/data/events';
import { AdSlot } from '@/components/AdSlot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { InstagramGrid } from '@/components/InstagramGrid';
import { openVenmoPay } from '@/lib/venmo';
import * as Linking from 'expo-linking';

const colors = { bg: '#FFEB99', text: '#000000', sub: '#333333', muted: '#555555' };

export default function PerformerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = performers.find(x => x.id === id);
  const userId = 'demoUser';

  if (!p) return <View><Text>Performer not found.</Text></View>;

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
        <Image source={{ uri: p.photoUrl }} style={{ width: '100%', height: 280 }} />

        <View style={{ padding: 16, backgroundColor: colors.bg }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{p.stageName}</Text>
          {p.bio ? <Text style={{ color: colors.muted, marginTop: 6 }}>{p.bio}</Text> : null}
          {p.bookingInfo ? <Text style={{ color: colors.sub, marginTop: 6 }}>Booking: {p.bookingInfo}</Text> : null}

          {/* Actions */}
          <View style={{ marginTop: 16, rowGap: 12 }}>
            <PrimaryButton
              title="Tip via Venmo"
              onPress={() => openVenmoPay(p.venmoHandle, undefined, `Tip-${p.id}-${userId}`)}
            />
            <PrimaryButton
              title="Request Booking"
              onPress={() => router.push(`/performer/${p.id}/book`)}
            />
            {p.commissionsEnabled ? (
              <PrimaryButton
                title="Request Commission"
                onPress={() => router.push(`/performer/${p.id}/book?type=commission`)}
              />
            ) : null}
            <PrimaryButton
              title="Back to Discover"
              onPress={() => router.push('/(tabs)/discover')}
            />
          </View>

          {/* Instagram grid */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Instagram</Text>
            <InstagramGrid photos={p.instagramPhotos || []} profileUrl={p.socials?.instagram} />
            {p.socials?.instagram ? (
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Open Instagram Profile"
                  onPress={() => Linking.openURL(p.socials!.instagram!)}
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