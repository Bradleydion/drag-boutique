// app/auth/reset-password.tsx
// Reached via the sequins://auth/reset-password deep link after the user clicks
// the password reset email. By the time we arrive here, _layout.tsx has already
// called supabase.auth.setSession() so we have an active recovery session and
// can call updateUser() directly.

import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { colors } from '../../src/theme/colors';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleReset() {
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      // Give the user a moment to read the success message, then move on.
      setTimeout(() => router.replace('/(tabs)/discover'), 2500);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 28, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={{ color: colors.coral, fontSize: 32, fontWeight: '900', textAlign: 'center', marginTop: 16 }}>
            Sequins
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
            Set a new password
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 32 }}>
            Choose something secure — at least 6 characters.
          </Text>

          {done ? (
            <View style={{
              backgroundColor: colors.teal + '22',
              borderRadius: 14,
              padding: 20,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.teal,
            }}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>✓</Text>
              <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                Password updated!
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                Taking you to the app…
              </Text>
            </View>
          ) : (
            <>
              {/* New password */}
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                NEW PASSWORD
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="new-password"
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  color: colors.textPrimary,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 16,
                }}
              />

              {/* Confirm password */}
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                CONFIRM PASSWORD
              </Text>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="new-password"
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  color: colors.textPrimary,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 8,
                }}
              />

              {error ? (
                <Text style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{error}</Text>
              ) : <View style={{ height: 20 }} />}

              {loading ? (
                <ActivityIndicator color={colors.teal} style={{ marginVertical: 16 }} />
              ) : (
                <PrimaryButton title="Update Password" onPress={handleReset} />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
