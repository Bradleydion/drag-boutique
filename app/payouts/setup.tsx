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
import { getSession } from '../../lib/authStore';
import { getHostEventCount } from '../../lib/eventsStore';
import { getSellerSoldCount } from '../../lib/marketplaceStore';
import { feePercentForVolume, nextTier } from '../../lib/feeTiers';
import { colors } from '../../src/theme/colors';

export default function PayoutSetupScreen() {
  const [account, setAccount] = useState<PayoutAccount | null>(getPayoutAccount());
  const [loading, setLoading] = useState(!payoutAccountLoaded());
  const [starting, setStarting] = useState(false);
  const [volume, setVolume] = useState<number | null>(null);
  const role = getRole();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      const userId = getSession()?.user?.id;
      const volumePromise = !userId
        ? Promise.resolve(0)
        : role === 'host'
        ? getHostEventCount(userId)
        : getSellerSoldCount(userId);

      Promise.all([loadPayoutAccount(), volumePromise]).then(([, vol]) => {
        if (!cancelled) {
          setAccount(getPayoutAccount());
          setVolume(vol);
          setLoading(false);
        }
      });
      return () => { cancelled = true; };
    }, [role]),
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

            {/* ── Fee tier dashboard ─────────────────────────────────────── */}
            {volume != null && (role === 'host' || role === 'artist') && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginTop: 24,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 16, marginBottom: 4 }}>
                  📊 Your Service Fee
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
                  {role === 'host' ? 'Based on shows posted' : 'Based on items/commissions sold'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
                  <Text style={{ color: colors.teal, fontSize: 36, fontWeight: '900' }}>
                    {(feePercentForVolume(volume) * 100).toFixed(0)}%
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6 }}>
                    current fee — {volume} {role === 'host' ? 'show' : 'sale'}{volume === 1 ? '' : 's'} so far
                  </Text>
                </View>

                {(() => {
                  const next = nextTier(volume);
                  if (!next) {
                    return (
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                        🎉 You've hit our lowest rate — 4% is as low as it goes.
                      </Text>
                    );
                  }
                  const progress = Math.min(1, volume / next.threshold);
                  return (
                    <>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden', marginBottom: 8 }}>
                        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.teal }} />
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                        {next.remaining} more {role === 'host' ? 'show' : 'sale'}{next.remaining === 1 ? '' : 's'} to drop to{' '}
                        <Text style={{ color: colors.teal, fontWeight: '700' }}>{(next.percent * 100).toFixed(0)}%</Text>
                      </Text>
                    </>
                  );
                })()}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
