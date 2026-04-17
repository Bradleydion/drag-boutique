// app/(tabs)/marketplace.tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRole } from '../../lib/userStore';
import {
  CATEGORY_META,
  CONDITION_LABELS,
  ListingCategory,
  getListings,
  loadListings,
} from '../../lib/marketplaceStore';
import { colors } from '../../src/theme/colors';

const CATEGORIES: { id: ListingCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all',         label: 'All',         emoji: '✨' },
  { id: 'wigs',        label: 'Wigs',        emoji: '👱' },
  { id: 'dresses',     label: 'Dresses',     emoji: '👗' },
  { id: 'accessories', label: 'Accessories', emoji: '💍' },
  { id: 'shoes',       label: 'Shoes',       emoji: '👠' },
  { id: 'commissions', label: 'Commissions', emoji: '🧵' },
];

export default function MarketplaceTab() {
  const [activeCategory, setActiveCategory] = useState<ListingCategory | 'all'>('all');
  const [, setRefresh] = useState(0);
  const [role, setRole] = useState(getRole());

  // Re-read role + reload listings whenever the tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      setRole(getRole());
      loadListings().then(() => setRefresh(n => n + 1));
    }, []),
  );

  const rawListings = activeCategory === 'all' ? getListings() : getListings(activeCategory);
  // Pad to even count so the last row always has 2 columns
  const listings = rawListings.length % 2 !== 0
    ? [...rawListings, { id: '__spacer__' } as any]
    : rawListings;

  const canList = role === 'artist' || role === 'host';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }} edges={['left', 'right', 'bottom']}>

      {/* List Something banner — artists and hosts only */}
      {canList && (
        <Pressable
          onPress={() => router.push('/marketplace/create')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.coral,
            marginHorizontal: 16,
            marginTop: 12,
            marginBottom: 4,
            borderRadius: 14,
            paddingVertical: 13,
            paddingHorizontal: 20,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 16 }}>✦</Text>
          <Text style={{ color: colors.offWhite, fontWeight: '800', fontSize: 15 }}>
            List Something
          </Text>
        </Pressable>
      )}

      {/* Category filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 52 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' }}
      >
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: active ? colors.teal : colors.surface,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: active ? colors.teal : colors.border,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
              <Text style={{
                color: active ? colors.navy : colors.textSecondary,
                fontWeight: '700',
                fontSize: 13,
              }}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Listings grid */}
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        columnWrapperStyle={{ gap: 10 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🛍️</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '700' }}>
              Nothing here yet
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
              Be the first to list something in this category.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          if (item.id === '__spacer__') return <View style={{ flex: 1 }} />;
          return (
          <Pressable
            onPress={() => router.push(`/marketplace/${item.id}`)}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 14,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {/* Image */}
            <Image
              source={{ uri: item.imageUrls[0] }}
              style={{ width: '100%', height: 160 }}
              resizeMode="cover"
            />

            {/* Commission / Swap badge */}
            {item.type !== 'sale' && (
              <View style={{
                position: 'absolute',
                top: 8, left: 8,
                backgroundColor: colors.peach,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Text style={{ color: colors.navy, fontSize: 11, fontWeight: '800' }}>
                  {item.type === 'commission' ? 'COMMISSION' : 'SWAP'}
                </Text>
              </View>
            )}

            {/* Info */}
            <View style={{ padding: 10 }}>
              <Text
                style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {item.sellerName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: colors.teal, fontWeight: '800', fontSize: 14 }}>
                  {item.price === 0 ? 'Get a Quote' : `$${item.price}`}
                </Text>
                {item.condition && (
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    {CONDITION_LABELS[item.condition]}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                {item.shipsNationwide && (
                  <View style={{ backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>Ships</Text>
                  </View>
                )}
                {item.localPickup && (
                  <View style={{ backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>Pickup</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
          );
        }}
      />

    </SafeAreaView>
  );
}
