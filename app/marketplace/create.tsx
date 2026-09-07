// app/marketplace/create.tsx
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { CATEGORY_META, ListingCategory, ListingCondition, ListingType, createListing } from '../../lib/marketplaceStore';
import { getEmail, getSession } from '../../lib/authStore';
import { getRole } from '../../lib/userStore';
import { colors } from '../../src/theme/colors';

const CATEGORIES = Object.entries(CATEGORY_META) as [ListingCategory, { label: string; emoji: string }][];
const CONDITIONS: { id: ListingCondition; label: string }[] = [
  { id: 'new',      label: 'New' },
  { id: 'like_new', label: 'Like New' },
  { id: 'good',     label: 'Good' },
  { id: 'fair',     label: 'Fair' },
];
const TYPES: { id: ListingType; label: string; desc: string }[] = [
  { id: 'sale',       label: 'For Sale',    desc: 'Set your price' },
  { id: 'swap',       label: 'Swap',        desc: 'Trade for something' },
  { id: 'commission', label: 'Commission',  desc: 'Custom work for hire' },
];

function OptionRow<T extends string>({
  options,
  selected,
  onSelect,
  renderLabel,
}: {
  options: T[];
  selected: T;
  onSelect: (v: T) => void;
  renderLabel: (v: T) => string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = selected === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={{
              backgroundColor: active ? colors.teal : colors.surface,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: active ? colors.teal : colors.border,
            }}
          >
            <Text style={{ color: active ? colors.navy : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
              {renderLabel(opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CreateListingScreen() {
  const email = getEmail();
  const displayName = getSession()?.user?.user_metadata?.display_name as string | undefined;
  const role = getRole();

  const [category, setCategory] = useState<ListingCategory>('wigs');
  const [type, setType] = useState<ListingType>('sale');
  const [condition, setCondition] = useState<ListingCondition>('like_new');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [ships, setShips] = useState(true);
  const [pickup, setPickup] = useState(false);
  const [tags, setTags] = useState('');

  function validate(): string | null {
    if (!title.trim()) return 'Title is required.';
    if (!description.trim()) return 'Description is required.';
    if (type === 'sale' && (!price || isNaN(Number(price)))) return 'Enter a valid price.';
    if (!ships && !pickup) return 'Select at least one delivery option.';
    return null;
  }

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const err = validate();
    if (err) { Alert.alert('Missing info', err); return; }

    setSubmitting(true);
    try {
      await createListing({
        sellerId: email ?? 'guest',
        sellerName: displayName ?? email?.split('@')[0] ?? 'You',
        sellerRole: (role === 'host' ? 'host' : 'artist') as 'artist' | 'host',
        category,
        type,
        condition: type !== 'commission' ? condition : undefined,
        title: title.trim(),
        description: description.trim(),
        price: type === 'commission' ? 0 : Number(price),
        imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'],
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        location: location.trim() || undefined,
        shipsNationwide: ships,
        localPickup: pickup,
      });
      Alert.alert('🎉 Listed!', 'Your item is now live in the marketplace.', [
        { text: 'Back to Shop', onPress: () => router.replace('/(tabs)/marketplace') },
      ]);
    } catch {
      Alert.alert('Error', 'Could not publish your listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 13,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  };

  const labelStyle = { color: colors.textSecondary, fontSize: 13, fontWeight: '700' as const, marginTop: 18, marginBottom: 4 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen options={{
        title: 'New Listing',
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.navy },
        headerTitleStyle: { color: colors.textPrimary },
        headerTintColor: colors.teal,
      }} />
      <KeyboardAvoidingView

        style={{ flex: 1 }}

        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

      >

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 4 }}>
          Create a Listing
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
          Fill in the details and go live instantly.
        </Text>

        {/* Listing type */}
        <Text style={labelStyle}>LISTING TYPE</Text>
        {TYPES.map(t => (
          <Pressable
            key={t.id}
            onPress={() => setType(t.id)}
            style={{
              backgroundColor: type === t.id ? colors.teal : colors.surface,
              borderRadius: 12,
              padding: 14,
              marginTop: 8,
              borderWidth: 1,
              borderColor: type === t.id ? colors.teal : colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: type === t.id ? colors.navy : colors.textPrimary, fontWeight: '700' }}>{t.label}</Text>
              <Text style={{ color: type === t.id ? colors.navy : colors.textSecondary, fontSize: 12, marginTop: 2 }}>{t.desc}</Text>
            </View>
            {type === t.id && <Text style={{ color: colors.navy, fontSize: 18 }}>✓</Text>}
          </Pressable>
        ))}

        {/* Category */}
        <Text style={labelStyle}>CATEGORY</Text>
        <OptionRow
          options={CATEGORIES.map(([id]) => id)}
          selected={category}
          onSelect={setCategory}
          renderLabel={id => `${CATEGORY_META[id].emoji} ${CATEGORY_META[id].label}`}
        />

        {/* Condition (not for commissions) */}
        {type !== 'commission' && (
          <>
            <Text style={labelStyle}>CONDITION</Text>
            <OptionRow
              options={CONDITIONS.map(c => c.id)}
              selected={condition}
              onSelect={setCondition}
              renderLabel={id => CONDITIONS.find(c => c.id === id)?.label ?? id}
            />
          </>
        )}

        {/* Title */}
        <Text style={labelStyle}>TITLE *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Platinum Lace Front Wig"
          placeholderTextColor={colors.textMuted}
          style={fieldStyle}
        />

        {/* Description */}
        <Text style={labelStyle}>DESCRIPTION *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Size, condition details, wear history, measurements..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={[fieldStyle, { minHeight: 100 }]}
        />

        {/* Price */}
        {type === 'sale' && (
          <>
            <Text style={labelStyle}>PRICE ($) *</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={fieldStyle}
            />
          </>
        )}

        {/* Location */}
        <Text style={labelStyle}>YOUR LOCATION</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g., Los Angeles, CA"
          placeholderTextColor={colors.textMuted}
          style={fieldStyle}
        />

        {/* Delivery */}
        <Text style={labelStyle}>DELIVERY OPTIONS * (select all that apply)</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          {[
            { label: '📦 Ships Nationwide', value: ships, toggle: () => setShips(s => !s) },
            { label: '🤝 Local Pickup', value: pickup, toggle: () => setPickup(p => !p) },
          ].map(opt => (
            <Pressable
              key={opt.label}
              onPress={opt.toggle}
              style={{
                flex: 1,
                backgroundColor: opt.value ? colors.teal : colors.surface,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: opt.value ? colors.teal : colors.border,
              }}
            >
              <Text style={{ color: opt.value ? colors.navy : colors.textSecondary, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tags */}
        <Text style={labelStyle}>TAGS (comma separated)</Text>
        <TextInput
          value={tags}
          onChangeText={setTags}
          placeholder="red, sequin, size M, gown"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={fieldStyle}
        />

        <View style={{ marginTop: 28 }}>
          <PrimaryButton title={submitting ? 'Publishing…' : 'Publish Listing ✦'} onPress={handleSubmit} />
        </View>

      </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
