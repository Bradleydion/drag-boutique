// app/marketplace/purchases.tsx
// Buyer-facing list of everything bought on the marketplace, with the
// ability to request a refund (respecting the listing's own refund window
// or "All Sales Final" setting).

import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadMyPurchases, requestListingRefund, type Listing } from '../../lib/marketplaceStore';
import { colors } from '../../src/theme/colors';

function isRefundEligible(listing: Listing): boolean {
  if (listing.paymentStatus !== 'paid') return false;
  if (listing.allSalesFinal) return false;
  if (listing.refundWindowDays == null) return true; // no explicit limit
  if (!listing.purchasedAt) return true;
  const deadline = new Date(listing.purchasedAt);
  deadline.setDate(deadline.getDate() + listing.refundWindowDays);
  return new Date() <= deadline;
}

export default function MyPurchasesScreen() {
  const [purchases, setPurchases] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setPurchases(await loadMyPurchases());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function handleRequestRefund(listing: Listing) {
    Alert.alert(
      'Request a refund?',
      `This asks ${listing.sellerName} to refund your $${listing.price} purchase. They'll need to approve it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Refund',
          style: 'destructive',
          onPress: async () => {
            setRequestingId(listing.id);
            try {
              await requestListingRefund(listing.id);
              Alert.alert('Refund requested', `${listing.sellerName} has been notified and will review your request.`);
              await refresh();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not submit refund request.');
            } finally {
              setRequestingId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: 'My Purchases',
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 20 }}>
          {purchases.length > 0
            ? `${purchases.length} purchase${purchases.length === 1 ? '' : 's'}`
            : 'Things you buy on the marketplace will show up here'}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : purchases.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🛍️</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
              No purchases yet
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/marketplace')}
              style={{ marginTop: 20, backgroundColor: colors.teal, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 }}
            >
              <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 15 }}>Browse Marketplace</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {purchases.map(listing => (
              <View
                key={listing.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                <Image source={{ uri: listing.imageUrls[0] }} style={{ width: 56, height: 56, borderRadius: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                    {listing.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    ${listing.price} · from {listing.sellerName}
                  </Text>

                  {listing.paymentStatus === 'refund_requested' && (
                    <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                      ⏳ Refund requested
                    </Text>
                  )}
                  {listing.paymentStatus === 'refunded' && (
                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                      ↩️ Refunded
                    </Text>
                  )}
                  {isRefundEligible(listing) && (
                    <Pressable
                      onPress={() => handleRequestRefund(listing)}
                      disabled={requestingId === listing.id}
                      style={{ marginTop: 8 }}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>
                        {requestingId === listing.id ? 'Submitting…' : 'Request Refund'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
