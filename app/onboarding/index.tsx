// app/onboarding/index.tsx
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ROLES, UserRole, setRole } from '../../lib/userStore';
import { colors } from '../../src/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

// Role accent colours to match what the original card used
const ROLE_ACCENTS: Record<string, string> = {
  fan:    colors.teal,
  artist: '#FB923C',
  host:   '#A78BFA',
};

export default function RoleSelectScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null);

  async function confirm() {
    if (!selected) return;
    await setRole(selected);
    if (selected === 'artist') {
      // Send talent straight to profile creation — they need a public page to get booked.
      router.replace('/performer/create' as any);
    } else if (selected === 'host') {
      // Host gets a quick setup screen (venue name, city, bio) before the organize tab.
      router.replace('/host/setup' as any);
    } else {
      // Fan lands on Discover; a dismissible nudge there prompts profile completion.
      router.replace('/(tabs)/discover');
    }
  }

  const activeAccent = selected ? (ROLE_ACCENTS[selected] ?? colors.teal) : colors.teal;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo hero ───────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: '#000000',
          alignItems: 'center',
          paddingTop: 36,
          paddingBottom: 28,
          paddingHorizontal: 24,
        }}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: SCREEN_W * 0.78, height: SCREEN_W * 0.32 }}
            resizeMode="contain"
          />
          <Text style={{
            color: '#888',
            fontSize: 14,
            textAlign: 'center',
            marginTop: 14,
            lineHeight: 21,
            fontWeight: '500',
          }}>
            The home of drag performance.{'\n'}Discover, create, and connect.
          </Text>
        </View>

        {/* ── Role picker ──────────────────────────────────────────────── */}
        <View style={{ padding: 24, paddingTop: 20 }}>
          <Text style={{
            color: colors.textPrimary,
            fontSize: 20,
            fontWeight: '900',
            marginBottom: 4,
          }}>
            Who are you here as?
          </Text>
          <Text style={{
            color: colors.textMuted,
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 20,
          }}>
            You can always change this later in your profile.
          </Text>

          {/* Role cards */}
          {ROLES.map((role) => {
            const isSelected = selected === role.id;
            const accent = ROLE_ACCENTS[role.id] ?? colors.teal;
            return (
              <Pressable
                key={role.id}
                onPress={() => setSelected(role.id)}
                style={{
                  backgroundColor: isSelected ? accent + '18' : colors.surface,
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: 12,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? accent : colors.border,
                }}
              >
                {/* Title row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <View style={{
                    width: 46, height: 46, borderRadius: 23,
                    backgroundColor: accent + '22',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 24 }}>{role.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: isSelected ? accent : colors.textPrimary,
                      fontSize: 17,
                      fontWeight: '900',
                    }}>
                      {role.title}
                    </Text>
                    <Text style={{
                      color: isSelected ? accent + 'CC' : colors.textMuted,
                      fontSize: 13,
                      marginTop: 1,
                    }}>
                      {role.tagline}
                    </Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: 2,
                    borderColor: isSelected ? accent : colors.border,
                    backgroundColor: isSelected ? accent : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && (
                      <Text style={{ color: colors.navy, fontSize: 12, fontWeight: '900' }}>✓</Text>
                    )}
                  </View>
                </View>

                {/* Perks */}
                <View style={{ gap: 5 }}>
                  {role.perks.map((perk) => (
                    <View key={perk} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{
                        width: 6, height: 6, borderRadius: 3,
                        backgroundColor: accent,
                        marginTop: 6,
                        flexShrink: 0,
                      }} />
                      <Text style={{
                        color: isSelected ? colors.textPrimary : colors.textSecondary,
                        flex: 1,
                        lineHeight: 20,
                        fontSize: 13,
                      }}>
                        {perk}
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}

          {/* CTA */}
          <View style={{ marginTop: 8 }}>
            {selected ? (
              <Pressable
                onPress={confirm}
                style={{
                  backgroundColor: activeAccent,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: colors.navy,
                  fontWeight: '900',
                  fontSize: 17,
                  letterSpacing: 0.3,
                }}>
                  Get Started →
                </Text>
              </Pressable>
            ) : (
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: 15 }}>
                  Select a role to continue
                </Text>
              </View>
            )}
          </View>

          <Text style={{
            color: colors.textMuted,
            fontSize: 11,
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 16,
          }}>
            By continuing you agree to our Terms of Service{'\n'}and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
