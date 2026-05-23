// app/host/setup.tsx
// Host profile setup — shown immediately after selecting the Host role in onboarding.
//
// Handles two host types:
//   Venue / Business  → bar, club, events company (name = venue/brand name)
//   Artist Host       → established performer who produces their own shows
//                       (name = stage name; option to also create a performer profile)
//
// All host metadata is saved to Supabase user_metadata. For artist-hosts, the
// performer profile shares the same user ID so the two records are implicitly
// linked without any extra join table.

import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateUserMetadata } from '../../lib/authStore';
import { colors } from '../../src/theme/colors';

const HOST_PURPLE = '#A78BFA';

type HostType = 'venue' | 'artist';

const HOST_TYPES: { id: HostType; emoji: string; title: string; subtitle: string }[] = [
  {
    id: 'venue',
    emoji: '🏢',
    title: 'Venue / Business',
    subtitle: 'A bar, club, event space, or production company',
  },
  {
    id: 'artist',
    emoji: '💃',
    title: 'Artist Host',
    subtitle: 'A performer who produces and hosts their own shows',
  },
];

export default function HostSetupScreen() {
  const [hostType,    setHostType]    = useState<HostType>('venue');
  const [name,        setName]        = useState('');
  const [city,        setCity]        = useState('');
  const [bio,         setBio]         = useState('');
  const [wantProfile, setWantProfile] = useState(true); // artist-host: also set up performer profile?
  const [saving,      setSaving]      = useState(false);

  const isArtist = hostType === 'artist';

  // Field labels adapt to host type
  const namePlaceholder = isArtist
    ? 'Your name or stage name'
    : 'e.g. The Velvet Room, Pride Events Co.';
  const nameLabel = isArtist ? 'Your Name / Stage Name *' : 'Venue or Business Name *';
  const bioPlaceholder = isArtist
    ? 'Tell performers and fans about your shows and your style as a host.'
    : 'What kind of shows do you run? What\'s your vibe?';

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Required', isArtist
        ? 'Please enter your name or stage name.'
        : 'Please enter your venue or business name.');
      return;
    }
    setSaving(true);
    try {
      await updateUserMetadata({
        host_type:  hostType,
        venue_name: name.trim(),   // 'venue_name' used as generic "primary display name" for hosts
        city:       city.trim(),
        host_bio:   bio.trim(),
      });

      if (isArtist && wantProfile) {
        // Route to performer/create so they can build their public talent page.
        // That screen routes to /(tabs)/organize on completion (or skip).
        router.replace('/performer/create' as any);
      } else {
        router.replace('/(tabs)/organize');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    router.replace('/(tabs)/organize');
  }

  const inputStyle = {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    marginTop: 6,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  } as const;

  const labelStyle = {
    color: colors.textPrimary,
    fontWeight: '800' as const,
    fontSize: 14,
    marginTop: 20,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <Text style={{ fontSize: 48, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>🎪</Text>
        <Text style={{
          color: colors.textPrimary,
          fontSize: 26, fontWeight: '900',
          textAlign: 'center', marginBottom: 10,
        }}>
          Set up your host profile
        </Text>
        <Text style={{
          color: colors.textMuted,
          fontSize: 14, lineHeight: 21,
          textAlign: 'center', marginBottom: 28,
        }}>
          Tell performers and fans who you are so they know what to expect from your shows.
        </Text>

        {/* ── Host type picker ──────────────────────────────────────────────── */}
        <Text style={{
          color: colors.textMuted,
          fontSize: 11, fontWeight: '700',
          textTransform: 'uppercase', letterSpacing: 0.8,
          marginBottom: 10,
        }}>
          I am a…
        </Text>
        <View style={{ gap: 10, marginBottom: 4 }}>
          {HOST_TYPES.map(type => {
            const isSelected = hostType === type.id;
            return (
              <Pressable
                key={type.id}
                onPress={() => setHostType(type.id)}
                style={{
                  backgroundColor: isSelected ? HOST_PURPLE + '18' : colors.surface,
                  borderRadius: 14,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? HOST_PURPLE : colors.border,
                  gap: 14,
                }}
              >
                <Text style={{ fontSize: 28 }}>{type.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: isSelected ? HOST_PURPLE : colors.textPrimary,
                    fontWeight: '800', fontSize: 15,
                  }}>
                    {type.title}
                  </Text>
                  <Text style={{
                    color: isSelected ? HOST_PURPLE + 'BB' : colors.textMuted,
                    fontSize: 12, marginTop: 2,
                  }}>
                    {type.subtitle}
                  </Text>
                </View>
                {/* Radio dot */}
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  borderWidth: 2,
                  borderColor: isSelected ? HOST_PURPLE : colors.border,
                  backgroundColor: isSelected ? HOST_PURPLE : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && (
                    <Text style={{ color: colors.navy, fontSize: 12, fontWeight: '900' }}>✓</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Profile fields ────────────────────────────────────────────────── */}
        <Text style={labelStyle}>{nameLabel}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={namePlaceholder}
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
        />
        {!isArtist && (
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
            This is the name performers will see when you send gig invites.
          </Text>
        )}

        <Text style={labelStyle}>City</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Portland, OR"
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
        />

        <Text style={labelStyle}>About your shows</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder={bioPlaceholder}
          placeholderTextColor={colors.textMuted}
          multiline
          style={[inputStyle, { minHeight: 100, textAlignVertical: 'top' }]}
        />

        {/* ── Artist host: performer profile toggle ─────────────────────────── */}
        {isArtist && (
          <View style={{
            marginTop: 24,
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: wantProfile ? HOST_PURPLE + '55' : colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}>
                  Also set up my performer profile
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3, lineHeight: 17 }}>
                  Create your public talent page so fans can follow you and other hosts can book you.
                  Your host and performer profiles are automatically linked.
                </Text>
              </View>
              <Switch
                value={wantProfile}
                onValueChange={setWantProfile}
                trackColor={{ false: colors.border, true: HOST_PURPLE }}
                thumbColor="#fff"
              />
            </View>
          </View>
        )}

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <View style={{ marginTop: 32 }}>
          {saving ? (
            <ActivityIndicator color={HOST_PURPLE} size="large" />
          ) : (
            <Pressable
              onPress={handleSave}
              style={{
                backgroundColor: HOST_PURPLE,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.navy, fontWeight: '900', fontSize: 17, letterSpacing: 0.3 }}>
                {isArtist && wantProfile ? 'Next: Build Performer Profile →' : 'Let\'s go →'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 12 }} />
        <Pressable onPress={skip} accessibilityRole="button">
          <Text style={{
            color: colors.textMuted,
            textAlign: 'center',
            textDecorationLine: 'underline',
            fontSize: 13,
          }}>
            Skip for now
          </Text>
        </Pressable>

        <Text style={{
          color: colors.textMuted, fontSize: 11,
          textAlign: 'center', marginTop: 20, lineHeight: 16,
        }}>
          You can update this anytime from your profile.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
