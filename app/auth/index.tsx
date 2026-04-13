// app/auth/index.tsx
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { signInAsGuest, signInWithEmail } from '../../lib/authStore';
import { getRole } from '../../lib/userStore';
import { colors } from '../../src/theme/colors';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const role = getRole();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmail() {
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.replace('/(tabs)/discover');
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    await signInAsGuest();
    router.replace('/(tabs)/discover');
  }

  const roleLabel = role === 'artist' ? 'Artist' : role === 'host' ? 'Host' : 'Fan';

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
            {mode === 'signin' ? 'Welcome back' : `Join as a ${roleLabel}`}
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 32 }}>
            {mode === 'signin'
              ? 'Sign in to your Sequins account'
              : 'Create your account to get started'}
          </Text>

          {/* Email */}
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
            EMAIL
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
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

          {/* Password */}
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
            PASSWORD
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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

          {/* Error */}
          {error ? (
            <Text style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{error}</Text>
          ) : <View style={{ height: 20 }} />}

          {/* Primary CTA */}
          {loading ? (
            <ActivityIndicator color={colors.teal} style={{ marginVertical: 16 }} />
          ) : (
            <PrimaryButton
              title={mode === 'signin' ? 'Sign In' : 'Create Account'}
              onPress={handleEmail}
            />
          )}

          {/* Mode toggle */}
          <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 16 }}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: colors.teal, fontWeight: '700' }}>
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textMuted, marginHorizontal: 12, fontSize: 13 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* Social stubs */}
          <View style={{ gap: 12 }}>
            <Pressable
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: colors.border, gap: 10,
              }}
              onPress={() => setError('Apple Sign In coming soon.')}
            >
              <Text style={{ fontSize: 20 }}>🍎</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 16 }}>
                Continue with Apple
              </Text>
            </Pressable>

            <Pressable
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: colors.border, gap: 10,
              }}
              onPress={() => setError('Google Sign In coming soon.')}
            >
              <Text style={{ fontSize: 20 }}>G</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 16 }}>
                Continue with Google
              </Text>
            </Pressable>
          </View>

          {/* Guest mode */}
          <Pressable onPress={handleGuest} style={{ marginTop: 28 }}>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
              Skip for now —{' '}
              <Text style={{ color: colors.textSecondary, textDecorationLine: 'underline' }}>
                Continue as Guest
              </Text>
            </Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
