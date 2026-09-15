// app/subscription/index.tsx
// Sequins Pro subscription management for hosts. Reached from the Profile
// tab's "Subscription" entry, and from the upsell prompts on the create-event
// flow when a free-tier host hits the monthly limit or a locked recurring
// frequency.

import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useStripe } from '@stripe/stripe-react-native';
import {
  getSubscription,
  loadSubscription,
  subscriptionLoaded,
  isPro,
  startProCheckout,
  getBillingPortalUrl,
  PRO_PRICE_LABEL,
  type Subscription,
} from '../../lib/subscriptionStore';
import { getHostEventCountThisMonth } from '../../lib/eventsStore';
import { getSession } from '../../lib/authStore';
import { colors } from '../../src/theme/colors';

const PRO_BENEFITS = [
  'Unlimited event posts every month',
  'Weekly recurring shows (free plan is monthly only)',
  'Everything in the free plan',
];

export default function SubscriptionScreen() {
  const [sub, setSub] = useState<Subscription>(getSubscription());
  const [loading, setLoading] = useState(!subscriptionLoaded());
  const [eventsThisMonth, setEventsThisMonth] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      const userId = getSession()?.user?.id;
      Promise.all([
        loadSubscription(),
        userId ? getHostEventCountThisMonth(userId) : Promise.resolve(0),
      ]).then(([, count]) => {
        if (!cancelled) {
          setSub(getSubscription());
          setEventsThisMonth(count);
          setLoading(false);
        }
      });
      return () => { cancelled = true; };
    }, []),
  );

  async function handleUpgrade() {
    setWorking(true);
    try {
      const result = await startProCheckout();
      if ('alreadyPro' in result) {
        Alert.alert('You’re already Pro!', 'Your subscription is already active.');
        setSub(getSubscription());
        return;
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Sequins',
        paymentIntentClientSecret: result.clientSecret,
        defaultBillingDetails: {},
        appearance: {
          colors: {
            primary: colors.teal,
            background: colors.navy,
            componentBackground: colors.surface,
            componentBorder: colors.border,
            primaryText: colors.textPrimary,
            secondaryText: colors.textSecondary,
            placeholderText: colors.textMuted,
          },
        },
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') return;
        throw new Error(presentError.message);
      }

      Alert.alert(
        '🎉 Welcome to Sequins Pro!',
        'Your subscription is confirmed. It may take a few seconds to activate.',
      );
      // The webhook flips tier -> 'pro' a beat after payment; give it a moment.
      await new Promise(resolve => setTimeout(resolve, 1500));
      await loadSubscription();
      setSub(getSubscription());
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleManage() {
    setWorking(true);
    try {
      const url = await getBillingPortalUrl();
      await WebBrowser.openBrowserAsync(url);
      await loadSubscription();
      setSub(getSubscription());
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not open billing portal.');
    } finally {
      setWorking(false);
    }
  }

  const pro = isPro();
  const renewalDate = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: 'Subscription',
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
                borderColor: pro ? colors.teal + '55' : colors.border,
                marginBottom: 20,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 40, marginBottom: 8 }}>{pro ? '👑' : '🎪'}</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 18, textAlign: 'center', marginBottom: 6 }}>
                {pro ? 'Sequins Pro' : 'Free Plan'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                {pro
                  ? `You're all set with unlimited events and weekly recurring shows.${renewalDate ? ` Renews ${renewalDate}.` : ''}`
                  : eventsThisMonth != null
                  ? `${eventsThisMonth} of 1 event posted this month · monthly recurring only`
                  : 'Limited to 1 new event per month, monthly recurring only.'}
              </Text>
            </View>

            {!pro && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 20,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 16, marginBottom: 12 }}>
                  What you get with Pro — {PRO_PRICE_LABEL}
                </Text>
                {PRO_BENEFITS.map(b => (
                  <View key={b} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <Text style={{ color: colors.teal, fontSize: 14 }}>✓</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1, lineHeight: 20 }}>{b}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={pro ? handleManage : handleUpgrade}
              disabled={working}
              style={{
                backgroundColor: pro ? colors.surface : colors.teal,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                borderWidth: pro ? 1 : 0,
                borderColor: colors.border,
                opacity: working ? 0.7 : 1,
              }}
            >
              {working ? (
                <ActivityIndicator color={pro ? colors.textPrimary : colors.navy} />
              ) : (
                <Text style={{ color: pro ? colors.textPrimary : colors.navy, fontWeight: '800', fontSize: 16 }}>
                  {pro ? 'Manage Subscription' : `Upgrade to Pro — ${PRO_PRICE_LABEL}`}
                </Text>
              )}
            </Pressable>

            {!pro && (
              <Pressable onPress={() => router.back()} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Maybe later</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
