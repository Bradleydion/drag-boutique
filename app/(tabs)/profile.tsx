// app/(tabs)/profile.tsx
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAccount, getEmail, getSession, isGuest, signOut, updateDisplayName } from '../../lib/authStore';
import { clearRole, getRole } from '../../lib/userStore';
import { colors } from '../../src/theme/colors';

// Role-specific sections shown beneath the main profile card
const ROLE_SECTIONS: Record<string, { emoji: string; label: string; sublabel: string }[]> = {
  artist: [
    { emoji: '🎭', label: 'Performer Profile', sublabel: 'Edit your public page, bio & photos' },
    { emoji: '📅', label: 'Bookings', sublabel: 'View upcoming and past gigs' },
    { emoji: '💰', label: 'Earnings', sublabel: 'Tips, bookings, and commissions' },
  ],
  host: [
    { emoji: '🎪', label: 'My Events', sublabel: 'Manage events you\'ve created' },
    { emoji: '👥', label: 'Staff Roster', sublabel: 'Manage DJs, door crew, tip takers' },
    { emoji: '🧾', label: 'Invoices', sublabel: 'View and send event invoices' },
    { emoji: '💸', label: 'Payouts', sublabel: 'Pay staff via Venmo or Stripe' },
  ],
  fan: [
    { emoji: '🎟️', label: 'My Tickets', sublabel: 'Your purchased event tickets' },
    { emoji: '⭐', label: 'Following', sublabel: 'Artists and venues you follow' },
    { emoji: '💝', label: 'Tips Sent', sublabel: 'Your tipping history' },
  ],
};

const ROLE_COLORS: Record<string, string> = {
  artist: colors.coral,
  host:   colors.peach,
  fan:    colors.teal,
};

const ROLE_LABELS: Record<string, string> = {
  artist: '💃 Artist',
  host:   '🎪 Host',
  fan:    '🎟️ Fan',
};

function getInitials(name?: string, email?: string): string {
  if (name?.trim()) return name.trim().slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
}

export default function ProfileTab() {
  const email = getEmail();
  const guest = isGuest();
  const displayNameFromMeta = getSession()?.user?.user_metadata?.display_name as string | undefined;
  const role = getRole() ?? 'fan';

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayNameFromMeta ?? '');

  async function saveName() {
    await updateDisplayName(nameInput);
    setEditingName(false);
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — makes it harder to do accidentally.
            Alert.alert(
              'Are you absolutely sure?',
              'Your account, tickets, listings, and profile will be gone forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace('/auth');
                    } catch {
                      Alert.alert('Error', 'Could not delete account. Please try again or contact support.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function handleChangeRole() {
    Alert.alert('Change Role', 'This will take you back to role selection.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: async () => {
          await clearRole();
          await signOut();
          router.replace('/onboarding');
        },
      },
    ]);
  }

  const sections = ROLE_SECTIONS[role] ?? ROLE_SECTIONS.fan;
  const roleColor = ROLE_COLORS[role] ?? colors.teal;
  const roleLabel = ROLE_LABELS[role] ?? 'Fan';
  const initials = getInitials(displayNameFromMeta, email);
  const displayName = displayNameFromMeta || (email ? email.split('@')[0] : 'Guest');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

        {/* Avatar + name card */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 24,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 20,
        }}>
          {/* Avatar circle */}
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: roleColor,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Text style={{ color: colors.navy, fontSize: 28, fontWeight: '900' }}>{initials}</Text>
          </View>

          {/* Display name (editable) */}
          {editingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={{
                  color: colors.textPrimary,
                  fontSize: 18,
                  fontWeight: '700',
                  borderBottomWidth: 2,
                  borderBottomColor: colors.teal,
                  paddingBottom: 4,
                  minWidth: 120,
                  textAlign: 'center',
                }}
              />
              <Pressable onPress={saveName}>
                <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 15 }}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditingName(true)} style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
                {displayName}{' '}
                <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '400' }}>✎</Text>
              </Text>
            </Pressable>
          )}

          {/* Role badge */}
          <View style={{
            backgroundColor: roleColor + '22',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: roleColor,
            marginBottom: 8,
          }}>
            <Text style={{ color: roleColor, fontWeight: '700', fontSize: 13 }}>{roleLabel}</Text>
          </View>

          {/* Auth method */}
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {guest ? 'Browsing as guest' : email ?? ''}
          </Text>

          {/* Guest upgrade prompt */}
          {guest && (
            <Pressable
              onPress={() => router.push('/auth')}
              style={{
                marginTop: 14,
                backgroundColor: colors.teal,
                borderRadius: 10,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 14 }}>
                Create an Account
              </Text>
            </Pressable>
          )}
        </View>

        {/* Role-specific sections */}
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          {roleLabel.toUpperCase().replace(/[^A-Z ]/g, '').trim()} FEATURES
        </Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {sections.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => Alert.alert('Coming Soon', `${item.label} will be available in a future update.`)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{item.label}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{item.sublabel}</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Settings */}
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          ACCOUNT
        </Text>
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={handleChangeRole}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 22 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>Change Role</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>Switch between Fan, Artist, or Host</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>

          <Pressable
            onPress={handleSignOut}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 22 }}>🚪</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>Sign Out</Text>
            </View>
          </Pressable>

          {/* Delete account — only shown to authenticated (non-guest) users */}
          {!guest && (
            <Pressable
              onPress={handleDeleteAccount}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.danger + '55',
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 22 }}>🗑️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>Delete Account</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>Permanently remove your account and data</Text>
              </View>
            </Pressable>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
