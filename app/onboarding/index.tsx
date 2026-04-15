// app/onboarding/index.tsx
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ROLES, UserRole, setRole } from '../../lib/userStore';
import { colors } from '../../src/theme/colors';

export default function RoleSelectScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null);

  async function confirm() {
    if (!selected) return;
    await setRole(selected);
    router.replace('/auth');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>

        {/* Header */}
        <Text style={{ color: colors.coral, fontSize: 32, fontWeight: '900', textAlign: 'center', marginTop: 12 }}>
          Sequins
        </Text>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
          Who are you here as?
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 32, lineHeight: 22 }}>
          You can always change this later in your profile.
        </Text>

        {/* Role cards */}
        {ROLES.map((role) => {
          const isSelected = selected === role.id;
          return (
            <Pressable
              key={role.id}
              onPress={() => setSelected(role.id)}
              style={{
                backgroundColor: isSelected ? colors.teal : colors.surface,
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                borderWidth: 2,
                borderColor: isSelected ? colors.teal : colors.border,
              }}
            >
              {/* Title row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 28, marginRight: 10 }}>{role.emoji}</Text>
                <View>
                  <Text style={{ color: isSelected ? colors.navy : colors.textPrimary, fontSize: 20, fontWeight: '800' }}>
                    {role.title}
                  </Text>
                  <Text style={{ color: isSelected ? colors.navy : colors.textSecondary, fontSize: 13, marginTop: 1 }}>
                    {role.tagline}
                  </Text>
                </View>
              </View>

              {/* Perks */}
              {role.perks.map((perk) => (
                <View key={perk} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }}>
                  <Text style={{ color: isSelected ? colors.navy : colors.teal, marginRight: 8, marginTop: 1 }}>✦</Text>
                  <Text style={{ color: isSelected ? colors.navy : colors.textSecondary, flex: 1, lineHeight: 20 }}>
                    {perk}
                  </Text>
                </View>
              ))}
            </Pressable>
          );
        })}

        {/* CTA */}
        <View style={{ marginTop: 8 }}>
          {selected ? (
            <PrimaryButton
              title={`Continue as ${ROLES.find(r => r.id === selected)?.title} →`}
              onPress={confirm}
            />
          ) : (
            <View style={{ backgroundColor: colors.border, borderRadius: 12, padding: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>Select a role to continue</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
