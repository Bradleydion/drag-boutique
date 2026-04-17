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
import {
  getSession,
  resendConfirmationEmail,
  sendPasswordReset,
  signInAsGuest,
  signInWithEmail,
  signUpWithEmail,
} from '../../lib/authStore';
import { clearRole, hasRole } from '../../lib/userStore';
import { colors } from '../../src/theme/colors';

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showResend, setShowResend] = useState(false);

  function nextScreen() {
    router.replace(hasRole() ? '/(tabs)/discover' : '/onboarding');
  }

  function reset(newMode: Mode) {
    setMode(newMode);
    setError('');
    setInfo('');
    setShowResend(false);
  }

  // ── Email / password submit ────────────────────────────────────────────────
  async function handleEmail() {
    setError('');
    setInfo('');
    setShowResend(false);
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password);
        await clearRole();
        if (getSession()) {
          router.replace('/onboarding');
        } else {
          setInfo('Account created! Check your email to confirm, then sign in.');
          setMode('signin');
        }
      } else {
        await signInWithEmail(email.trim(), password);
        nextScreen();
      }
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Please confirm your email address first.');
        setShowResend(true);
      } else if (msg.includes('User already registered')) {
        setError('An account with this email already exists — try signing in.');
      } else if (msg.includes('Password should be')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot password submit ─────────────────────────────────────────────────
  async function handleForgot() {
    setError('');
    setInfo('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setInfo('Reset link sent — check your email.');
    } catch (e: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Resend confirmation email ──────────────────────────────────────────────
  async function handleResend() {
    setError('');
    setShowResend(false);
    setLoading(true);
    try {
      await resendConfirmationEmail(email.trim());
      setInfo('Confirmation email resent — check your inbox.');
    } catch {
      setError('Could not resend. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    await signInAsGuest();
    nextScreen();
  }

  const isForgot = mode === 'forgot';

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
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Join Sequins' : 'Reset your password'}
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 32 }}>
            {mode === 'signin'
              ? 'Sign in to your Sequins account'
              : mode === 'signup'
              ? 'Create your account to get started'
              : "Enter your email and we'll send you a reset link"}
          </Text>

          {/* Info banner */}
          {info ? (
            <View style={{
              backgroundColor: colors.teal + '22',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.teal,
            }}>
              <Text style={{ color: colors.teal, fontSize: 14, lineHeight: 20 }}>{info}</Text>
            </View>
          ) : null}

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

          {/* Password — hidden on forgot mode */}
          {!isForgot && (
            <>
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
                  marginBottom: 4,
                }}
              />
              {/* Forgot password link — sign-in only */}
              {mode === 'signin' && (
                <Pressable onPress={() => reset('forgot')} style={{ alignSelf: 'flex-end', marginBottom: 8, padding: 4 }}>
                  <Text style={{ color: colors.teal, fontSize: 13 }}>Forgot password?</Text>
                </Pressable>
              )}
            </>
          )}

          {/* Error */}
          {error ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text>
              {showResend && (
                <Pressable onPress={handleResend} style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.teal, fontSize: 14, fontWeight: '700' }}>
                    Resend confirmation email →
                  </Text>
                </Pressable>
              )}
            </View>
          ) : <View style={{ height: 20 }} />}

          {/* Primary CTA */}
          {loading ? (
            <ActivityIndicator color={colors.teal} style={{ marginVertical: 16 }} />
          ) : (
            <PrimaryButton
              title={mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              onPress={isForgot ? handleForgot : handleEmail}
            />
          )}

          {/* Mode toggle / back link */}
          {isForgot ? (
            <Pressable onPress={() => reset('signin')}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 16 }}>
                ← <Text style={{ color: colors.teal, fontWeight: '700' }}>Back to Sign In</Text>
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => reset(mode === 'signin' ? 'signup' : 'signin')}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 16 }}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: colors.teal, fontWeight: '700' }}>
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </Pressable>
          )}

          {/* Divider + social stubs — hidden on forgot mode */}
          {!isForgot && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <Text style={{ color: colors.textMuted, marginHorizontal: 12, fontSize: 13 }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>

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

              <Pressable onPress={handleGuest} style={{ marginTop: 28 }}>
                <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
                  Skip for now —{' '}
                  <Text style={{ color: colors.textSecondary, textDecorationLine: 'underline' }}>
                    Continue as Guest
                  </Text>
                </Text>
              </Pressable>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
