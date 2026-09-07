// app/marketplace/[id].tsx
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { CATEGORY_META, CONDITION_LABELS, getListing } from '../../lib/marketplaceStore';
import { colors } from '../../src/theme/colors';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = getListing(id);

  if (!listing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Listing not found.</Text>
      </SafeAreaView>
    );
  }

  const cat = CATEGORY_META[listing.category];

  function handleContact() {
    Alert.alert(
      listing.type === 'commission' ? 'Request a Quote' : 'Contact Seller',
      `In-app messaging is coming soon. For now, reach out to ${listing.sellerName} directly.`,
      [{ text: 'OK' }]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen options={{
        title: cat.emoji + ' ' + cat.label,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.navy },
        headerTitleStyle: { color: colors.textPrimary },
        headerTintColor: colors.teal,
      }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Hero image */}
        <Image
          source={{ uri: listing.imageUrls[0] }}
          style={{ width: '100%', height: 280 }}
          resizeMode="cover"
        />

        <View style={{ padding: 20 }}>

          {/* Title + price */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '900', flex: 1 }}>
              {listing.title}
            </Text>
            <Text style={{ color: colors.teal, fontSize: 22, fontWeight: '900' }}>
              {listing.price === 0 ? 'Quote' : `$${listing.price}`}
            </Text>
          </View>

          {/* Seller + badges row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              by <Text style={{ color: colors.peach, fontWeight: '700' }}>{listing.sellerName}</Text>
            </Text>
            {listing.condition && (
              <View style={{ backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{CONDITION_LABELS[listing.condition]}</Text>
              </View>
            )}
            {listing.type !== 'sale' && (
              <View style={{ backgroundColor: colors.peach + '33', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.peach }}>
                <Text style={{ color: colors.peach, fontSize: 12, fontWeight: '700' }}>
                  {listing.type === 'commission' ? 'Commission' : 'Swap'}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: 16 }}>
            {listing.description}
          </Text>

          {/* Tags */}
          {listing.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {listing.tags.map(tag => (
                <View key={tag} style={{ backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Delivery + location */}
          <View style={{ marginTop: 20, padding: 16, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
            {listing.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>📍</Text>
                <Text style={{ color: colors.textSecondary }}>{listing.location}</Text>
              </View>
            )}
            {listing.shipsNationwide && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>📦</Text>
                <Text style={{ color: colors.textSecondary }}>Ships nationwide</Text>
              </View>
            )}
            {listing.localPickup && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>🤝</Text>
                <Text style={{ color: colors.textSecondary }}>Local pickup available</Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <View style={{ marginTop: 24, gap: 12 }}>
            <PrimaryButton
              title={listing.type === 'commission' ? 'Request a Quote' : listing.type === 'swap' ? 'Propose a Swap' : 'Contact Seller'}
              onPress={handleContact}
            />
            <PrimaryButton
              title="Back to Marketplace"
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
