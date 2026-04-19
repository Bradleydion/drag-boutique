// app/event/create/basics.tsx
//
// Requires: npx expo install expo-image-picker
//
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getDraft, updateDraft } from '../../../lib/createEventStore';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors as C } from '../../../src/theme/colors';

// ─── Recurring frequency options ─────────────────────────────────────────────

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateEvent_Basics() {
  const draft = getDraft();

  const [title,          setTitle]          = useState(draft.title ?? '');
  const [description,    setDescription]    = useState(draft.description ?? '');
  const [datetimeStart,  setDatetimeStart]  = useState(draft.datetimeStart ?? '');
  const [datetimeEnd,    setDatetimeEnd]    = useState(draft.datetimeEnd ?? '');
  const [timezone,       setTimezone]       = useState(
    draft.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // Image
  const [imageUri, setImageUri] = useState<string | undefined>(draft.imageLocalUri);

  // Recurring
  const [isRecurring,   setIsRecurring]   = useState(draft.isRecurring ?? false);
  const [frequency,     setFrequency]     = useState<Frequency>(draft.recurringFrequency ?? 'weekly');
  const [recurringEnd,  setRecurringEnd]  = useState(draft.recurringEndDate ?? '');

  // ── Image picker ────────────────────────────────────────────────────────────

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload a flyer.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!title.trim()) e.push('Title is required.');
    if (datetimeStart && datetimeEnd) {
      const s  = Date.parse(datetimeStart);
      const en = Date.parse(datetimeEnd);
      if (!Number.isNaN(s) && !Number.isNaN(en) && en <= s) {
        e.push('End time must be after start time.');
      }
    }
    return e;
  }, [title, datetimeStart, datetimeEnd]);

  // ── Save + navigate ─────────────────────────────────────────────────────────

  function onNext() {
    updateDraft({
      title,
      description,
      datetimeStart,
      datetimeEnd,
      timezone,
      imageLocalUri:      imageUri,
      isRecurring,
      recurringFrequency: isRecurring ? frequency : undefined,
      recurringEndDate:   isRecurring ? (recurringEnd || undefined) : undefined,
    });
    router.push('/event/create/performers');
  }

  // ── Shared styles ───────────────────────────────────────────────────────────

  const inputStyle = {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    color: C.textPrimary,
    marginTop: 6,
  } as const;

  const labelStyle = { color: C.textPrimary, fontWeight: '800' as const };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Create Event • Basics',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          // basics.tsx is the first screen in the inner Stack so there's nothing
          // to go back to within this navigator — add a manual back button.
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -4 }}
            >
              <Ionicons name="chevron-back" size={26} color={C.teal} />
              <Text style={{ color: C.teal, fontSize: 17 }}>Back</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900' }}>Event basics</Text>
        <Text style={{ color: C.textMuted, marginTop: 4 }}>
          These details appear on the public event page.
        </Text>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <View style={{ height: 20 }} />
        <Text style={labelStyle}>Title *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Queen of the Night"
          placeholderTextColor={C.textMuted}
          autoCapitalize="sentences"
          style={inputStyle}
        />

        {/* ── Description ───────────────────────────────────────────────── */}
        <View style={{ height: 16 }} />
        <Text style={labelStyle}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What's the vibe? Hosts, themes, highlights…"
          placeholderTextColor={C.textMuted}
          multiline
          style={[inputStyle, { minHeight: 96 }]}
        />

        {/* ── Event flyer / image ───────────────────────────────────────── */}
        <View style={{ height: 16 }} />
        <Text style={labelStyle}>Event Flyer / Image</Text>
        <Pressable
          onPress={pickImage}
          style={{
            marginTop: 8,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: imageUri ? C.teal + '55' : C.border,
            borderStyle: imageUri ? 'solid' : 'dashed',
          }}
        >
          {imageUri ? (
            <View>
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 180 }}
                resizeMode="cover"
              />
              <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 8, alignItems: 'center',
              }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                  Tap to change
                </Text>
              </View>
            </View>
          ) : (
            <View style={{
              height: 140,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <Text style={{ fontSize: 32 }}>🖼️</Text>
              <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 14 }}>
                Upload a flyer or photo
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>
                Recommended: 16 × 9
              </Text>
            </View>
          )}
        </Pressable>
        {imageUri && (
          <Pressable onPress={() => setImageUri(undefined)} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
            <Text style={{ color: C.danger, fontSize: 12, fontWeight: '700' }}>Remove image</Text>
          </Pressable>
        )}

        {/* ── Start date ────────────────────────────────────────────────── */}
        <View style={{ height: 16 }} />
        <Text style={labelStyle}>Start date & time</Text>
        <TextInput
          value={datetimeStart}
          onChangeText={setDatetimeStart}
          placeholder={Platform.select({ default: '2026-06-01T20:00:00-07:00' })}
          autoCapitalize="none"
          placeholderTextColor={C.textMuted}
          style={inputStyle}
        />

        {/* ── End date ──────────────────────────────────────────────────── */}
        <View style={{ height: 14 }} />
        <Text style={labelStyle}>End date & time</Text>
        <TextInput
          value={datetimeEnd}
          onChangeText={setDatetimeEnd}
          placeholder={Platform.select({ default: '2026-06-02T00:00:00-07:00' })}
          autoCapitalize="none"
          placeholderTextColor={C.textMuted}
          style={inputStyle}
        />

        {/* ── Timezone ──────────────────────────────────────────────────── */}
        <View style={{ height: 14 }} />
        <Text style={labelStyle}>Timezone</Text>
        <TextInput
          value={timezone}
          onChangeText={setTimezone}
          placeholder="America/Los_Angeles"
          autoCapitalize="none"
          placeholderTextColor={C.textMuted}
          style={inputStyle}
        />

        {/* ── Recurring ─────────────────────────────────────────────────── */}
        <View style={{ height: 24 }} />
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: isRecurring ? C.teal + '55' : C.border,
        }}>
          {/* Toggle row */}
          <Pressable
            onPress={() => setIsRecurring(r => !r)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View>
              <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
                Recurring event
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                Repeats on a schedule
              </Text>
            </View>
            {/* Toggle pill */}
            <View style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              backgroundColor: isRecurring ? C.teal : C.border,
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}>
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: '#fff',
                alignSelf: isRecurring ? 'flex-end' : 'flex-start',
              }} />
            </View>
          </Pressable>

          {/* Frequency options — shown when recurring is on */}
          {isRecurring && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Frequency
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {FREQ_OPTIONS.map(opt => {
                  const active = frequency === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setFrequency(opt.value)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: active ? C.teal : C.navy,
                        borderWidth: 1,
                        borderColor: active ? C.teal : C.border,
                      }}
                    >
                      <Text style={{
                        color: active ? C.navy : C.textSecondary,
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ height: 16 }} />
              <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 13 }}>
                Series end date (optional)
              </Text>
              <TextInput
                value={recurringEnd}
                onChangeText={setRecurringEnd}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                placeholderTextColor={C.textMuted}
                style={[inputStyle, { fontSize: 14 }]}
              />
            </View>
          )}
        </View>

        {/* ── Errors ────────────────────────────────────────────────────── */}
        {errors.length > 0 && (
          <Text style={{ color: C.danger, marginTop: 12 }}>{errors.join(' ')}</Text>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <View style={{ height: 24 }} />
        <PrimaryButton
          title="Next: Venue →"
          onPress={onNext}
        />
        <View style={{ height: 12 }} />
        <Pressable onPress={() => router.replace('/(tabs)/discover')} accessibilityRole="button">
          <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>
            Cancel
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
