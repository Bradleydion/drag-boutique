// app/subscription/index.tsx
// Sequins Pro subscription management for hosts. Reached from the Profile
// tab's "Subscription" entry, and from the upsell prompts on the create-event
// flow when a free-tier host hits the monthly limit or a locked recurring
// frequency.

import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { iapAvailable, buyProInApp, restorePurchasesInApp, manageStoreSubscription, getStorePrice } from '../../lib/purchases';
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
import { goBack } from '../../lib/nav';

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
  const [storePrice, setStorePrice] = useState<string | null>(null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const useIap = iapAvailable();
  const priceLabel = storePrice ? `${storePrice}/mo` : PRO_PRICE_LABEL;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      const userId = getSession()?.user?.id;
      Promise.all([
        loadSubscription(),
        userId ? getHostEventCountThisMonth(userId) : Promise.resolve(0),
      ]).then(([, count]) => {
        if (useIap && userId) getStorePrice('pro', userId).then(p => { if (!cancelled) setStorePrice(p); });
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
      const userId = getSession()?.user?.id;
      if (useIap && userId) {
        const r = await buyProInApp(userId);
        if (r.status === 'cancelled') return;
        await loadSubscription();
        setSub(getSubscription());
        Alert.alert('🎉 Welcome to Sequins Pro!', 'Unlimited shows and weekly repeating events are unlocked.');
        return;
      }
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
            componentText: colors.textPrimary, // typed card number/expiry/CVC
            icon: colors.textSecondary,
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

  async function handleRestore() {
    const userId = getSession()?.user?.id;
    if (!userId) return;
    setWorking(true);
    try {
      const pro = await restorePurchasesInApp(userId);
      await loadSubscription();
      setSub(getSubscription());
      Alert.alert(pro ? 'Purchases restored' : 'Nothing to restore', pro ? 'Sequins Pro is active on this account.' : 'We didn’t find an active Sequins Pro subscription for this Apple/Google account.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not restore purchases.');
    } finally {
      setWorking(false);
    }
  }

  async function handleManage() {
    setWorking(true);
    try {
      const userId = getSession()?.user?.id;
      if (sub.store && userId) {
        await manageStoreSubscription(userId);
        return;
      }
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
  // Comped Pro (founding members): no Stripe subscription, so nothing to renew or manage.
  const comped = pro && !sub.stripeBacked;
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
                  ? comped
                    ? `Founding member: Pro is free through ${renewalDate}. Unlimited events and weekly recurring shows until then.`
                    : `You're all set with unlimited events and weekly recurring shows.${renewalDate ? ` Renews ${renewalDate}.` : ''}`
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
                  What you get with Pro — {priceLabel}
                </Text>
                {PRO_BENEFITS.map(b => (
                  <View key={b} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <Text style={{ color: colors.teal, fontSize: 14 }}>✓</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1, lineHeight: 20 }}>{b}</Text>
                  </View>
                ))}
              </View>
            )}

            {!comped && (
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
                  {pro ? 'Manage Subscription' : `Upgrade to Pro — ${priceLabel}`}
                </Text>
              )}
            </Pressable>
            )}

            {!pro && useIap && (
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
                {priceLabel.replace('/mo', ' a month')}, renews automatically until you cancel. Cancel anytime in your {sub.store === 'play_store' || (!sub.store && Platform.OS === 'android') ? 'Google Play' : 'App Store'} settings at least 24 hours before it renews.{' '}
                <Text style={{ color: colors.teal }} onPress={() => WebBrowser.openBrowserAsync('https://www.thebradleyproject.com/terms')}>Terms</Text>
                {' · '}
                <Text style={{ color: colors.teal }} onPress={() => WebBrowser.openBrowserAsync('https://www.thebradleyproject.com/privacy')}>Privacy</Text>
              </Text>
            )}

            {useIap && !comped && (
              <Pressable onPress={handleRestore} disabled={working} hitSlop={12} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '700' }}>Restore Purchases</Text>
              </Pressable>
            )}

            {!pro && (
              <Pressable onPress={() => goBack('/(tabs)/profile')} hitSlop={12} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Maybe later</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
