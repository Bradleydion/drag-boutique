// app/payouts/setup.tsx
// Stripe Connect payout onboarding -- shared by hosts (ticket sale payouts,
// after Sequins' service fee) and performers (commission + tip payouts).
// Reached from the Profile tab's "Payout Setup" entry.

import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getPayoutAccount,
  loadPayoutAccount,
  payoutAccountLoaded,
  startPayoutOnboarding,
  type PayoutAccount,
} from '../../lib/payoutStore';
import { getRole } from '../../lib/userStore';
import { colors } from '../../src/theme/colors';

export default function PayoutSetupScreen() {
  const [account, setAccount] = useState<PayoutAccount | null>(getPayoutAccount());
  const [loading, setLoading] = useState(!payoutAccountLoaded());
  const [starting, setStarting] = useState(false);
  const role = getRole();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loadPayoutAccount().then(() => {
        if (!cancelled) {
          setAccount(getPayoutAccount());
          setLoading(false);
        }
      });
      return () => { cancelled = true; };
    }, []),
  );

  async function handleSetUp() {
    setStarting(true);
    try {
      const result = await startPayoutOnboarding();
      if (result.status === 'complete') {
        Alert.alert('You’re all set!', 'Stripe has verified your account -- payouts are ready to go.');
      } else if (result.status === 'incomplete') {
        Alert.alert(
          'Almost there',
          'Stripe still needs a bit more info before payouts can start. You can pick up where you left off any time.',
        );
      }
      setAccount(getPayoutAccount());
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not start payout setup. Please try again.');
    } finally {
      setStarting(false);
    }
  }

  const status: 'none' | 'pending' | 'ready' = !account
    ? 'none'
    : account.onboarding_complete && account.payouts_enabled
    ? 'ready'
    : 'pending';

  const roleContext = role === 'host'
    ? 'ticket sale payouts (after Sequins’ service fee)'
    : 'commission and tip payouts';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: 'Set Up Payouts',
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 18,
                padding: 24,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 20,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 40, marginBottom: 8 }}>
                {status === 'ready' ? '✅' : status === 'pending' ? '⏳' : '🏦'}
              </Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 18, textAlign: 'center', marginBottom: 6 }}>
                {status === 'ready' ? 'Payouts are active' : status === 'pending' ? 'Setup in progress' : 'Set up payouts'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                {status === 'ready'
                  ? `Stripe is verified and ready to send your ${roleContext} directly to your bank account.`
                  : `Sequins uses Stripe to securely send your ${roleContext} to your bank account. It takes a few minutes -- you'll need your bank details and a government ID.`}
              </Text>
            </View>

            <Pressable
              onPress={handleSetUp}
              disabled={starting}
              style={{
                backgroundColor: status === 'ready' ? colors.surface : colors.teal,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                borderWidth: status === 'ready' ? 1 : 0,
                borderColor: colors.border,
                opacity: starting ? 0.7 : 1,
              }}
            >
              {starting ? (
                <ActivityIndicator color={status === 'ready' ? colors.textPrimary : colors.navy} />
              ) : (
                <Text style={{ color: status === 'ready' ? colors.textPrimary : colors.navy, fontWeight: '800', fontSize: 16 }}>
                  {status === 'ready' ? 'Update Payout Details' : status === 'pending' ? 'Continue Setup' : 'Set Up Payouts with Stripe'}
                </Text>
              )}
            </Pressable>

            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 }}>
              Payouts and identity verification are handled entirely by Stripe. Sequins never sees or stores your bank account number.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
