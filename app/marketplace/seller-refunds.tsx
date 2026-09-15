// app/marketplace/seller-refunds.tsx
// Seller-facing list of pending refund requests across all their marketplace
// listings. Approving actually refunds the buyer via Stripe (reversing the
// seller's payout); denying reverts the listing back to "paid".

import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSession } from '../../lib/authStore';
import {
  approveListingRefund,
  denyListingRefund,
  loadSellerRefundRequests,
  type Listing,
} from '../../lib/marketplaceStore';
import { colors } from '../../src/theme/colors';

export default function SellerRefundsScreen() {
  const [requests, setRequests] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sellerId = getSession()?.user?.id;
    if (!sellerId) { setLoading(false); return; }
    setLoading(true);
    setRequests(await loadSellerRefundRequests(sellerId));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function handleApprove(listing: Listing) {
    Alert.alert(
      'Approve refund?',
      `This refunds $${listing.price} to the buyer through Stripe and reverses your payout for this sale.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Refund',
          style: 'destructive',
          onPress: async () => {
            setActingId(listing.id);
            try {
              await approveListingRefund(listing.id);
              await refresh();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not process refund.');
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    );
  }

  async function handleDeny(listing: Listing) {
    setActingId(listing.id);
    try {
      await denyListingRefund(listing.id);
      await refresh();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not deny refund.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: 'Refund Requests',
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 20 }}>
          {requests.length > 0
            ? `${requests.length} pending request${requests.length === 1 ? '' : 's'}`
            : 'No pending refund requests on your listings'}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              You're all caught up — nothing waiting on you.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {requests.map(listing => (
              <View
                key={listing.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Image source={{ uri: listing.imageUrls[0] }} style={{ width: 48, height: 48, borderRadius: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                      {listing.title}
                    </Text>
                    <Text style={{ color: colors.teal, fontWeight: '800', fontSize: 14 }}>${listing.price}</Text>
                  </View>
                </View>
                {listing.refundRequestedAt && (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Requested {new Date(listing.refundRequestedAt).toLocaleDateString()}
                  </Text>
                )}
                {listing.refundReason && (
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>"{listing.refundReason}"</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={() => handleDeny(listing)}
                    disabled={actingId === listing.id}
                    style={{ flex: 1, backgroundColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>Deny</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleApprove(listing)}
                    disabled={actingId === listing.id}
                    style={{ flex: 1, backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 13 }}>
                      {actingId === listing.id ? 'Processing…' : 'Approve & Refund'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable onPress={() => router.back()} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: colors.teal, fontWeight: '700' }}>← Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
