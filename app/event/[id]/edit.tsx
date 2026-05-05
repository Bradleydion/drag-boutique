// app/event/[id]/edit.tsx
// Edit an existing event — pre-populated with the event's current values.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const GOLD = '#F59E0B';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { fetchEventById, updateEvent } from '../../../lib/eventsStore';
import { colors as C } from '../../../src/theme/colors';

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];

export default function EditEventScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);

  // Form state — populated from Supabase on mount
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [datetimeStart, setDatetimeStart] = useState('');
  const [datetimeEnd,   setDatetimeEnd]   = useState('');
  const [timezone,      setTimezone]      = useState('');
  const [imageUri,      setImageUri]      = useState<string | undefined>();
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>();
  const [isRecurring,   setIsRecurring]   = useState(false);
  const [frequency,     setFrequency]     = useState<Frequency>('weekly');
  const [recurringEnd,  setRecurringEnd]  = useState('');
  const [venueName,     setVenueName]     = useState('');
  const [venueAddress,  setVenueAddress]  = useState('');
  const [venueCity,     setVenueCity]     = useState('');
  const [venueState,    setVenueState]    = useState('');
  const [venueZip,      setVenueZip]      = useState('');
  const [venueInstagram,setVenueInstagram]= useState('');
  const [ticketPrice,   setTicketPrice]   = useState('');
  const [payoutVenmo,   setPayoutVenmo]   = useState('');
  const [salesStart,    setSalesStart]    = useState('');
  const [salesEnd,      setSalesEnd]      = useState('');
  const [isPromoted,    setIsPromoted]    = useState(false);

  useEffect(() => {
    fetchEventById(eventId).then(event => {
      if (!event) { Alert.alert('Error', 'Event not found.'); router.back(); return; }
      setTitle(event.title ?? '');
      setDescription(event.description ?? '');
      setDatetimeStart(event.datetimeStart ?? '');
      setDatetimeEnd(event.datetimeEnd ?? '');
      setTimezone(event.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
      setExistingImageUrl(event.imageUrl);
      setIsRecurring(event.isRecurring ?? false);
      setFrequency((event.recurringFrequency as Frequency) ?? 'weekly');
      setRecurringEnd(event.recurringEndDate ?? '');
      setVenueName(event.venue?.name ?? '');
      setVenueAddress(event.venue?.address ?? '');
      setVenueCity(event.venue?.city ?? '');
      setVenueState(event.venue?.state ?? '');
      setVenueZip(event.venue?.zip ?? '');
      setVenueInstagram(event.venue?.instagram ?? '');
      setTicketPrice(event.ticketing?.price !== undefined ? String(event.ticketing.price) : '');
      setPayoutVenmo(event.ticketing?.payoutVenmo ?? '');
      setSalesStart(event.ticketing?.salesStart ?? '');
      setSalesEnd(event.ticketing?.salesEnd ?? '');
      setIsPromoted(event.isPromoted ?? false);
      setLoading(false);
    });
  }, [eventId]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!title.trim()) e.push('Title is required.');
    if (datetimeStart && datetimeEnd) {
      const s = Date.parse(datetimeStart), en = Date.parse(datetimeEnd);
      if (!isNaN(s) && !isNaN(en) && en <= s) e.push('End time must be after start time.');
    }
    return e;
  }, [title, datetimeStart, datetimeEnd]);

  async function handleSave() {
    if (errors.length > 0) { Alert.alert('Fix errors', errors.join('\n')); return; }
    setSaving(true);
    try {
      await updateEvent(eventId, {
        title,
        description,
        datetimeStart,
        datetimeEnd,
        timezone,
        imageLocalUri: imageUri,
        isRecurring,
        recurringFrequency: isRecurring ? frequency : '',
        recurringEndDate:   isRecurring ? recurringEnd : '',
        venueName,
        venueAddress,
        venueCity,
        venueState,
        venueZip,
        venueInstagram,
        ticketPrice: ticketPrice ? parseFloat(ticketPrice) : 0,
        payoutVenmo,
        salesStart,
        salesEnd,
        isPromoted,
      });
      Alert.alert('✅ Saved', 'Your event has been updated.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    color: C.textPrimary,
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.border,
  } as const;
  const labelStyle = { color: C.textPrimary, fontWeight: '800' as const };
  const sectionLabel = {
    color: C.textMuted, fontSize: 11, fontWeight: '700' as const,
    textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 4, marginTop: 24,
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.teal} />
      </SafeAreaView>
    );
  }

  const displayImage = imageUri ?? existingImageUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Edit Event',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900' }}>Edit event</Text>
        <Text style={{ color: C.textMuted, marginTop: 4, marginBottom: 20 }}>Changes save immediately to your live event.</Text>

        {/* ── Basics ───────────────────────────────────────────────────── */}
        <Text style={sectionLabel}>Basics</Text>

        <Text style={labelStyle}>Title *</Text>
        <TextInput value={title} onChangeText={setTitle} style={inputStyle} placeholderTextColor={C.textMuted} placeholder="Event title" autoCapitalize="sentences" />

        <View style={{ height: 12 }} />
        <Text style={labelStyle}>Description</Text>
        <TextInput value={description} onChangeText={setDescription} style={[inputStyle, { minHeight: 80 }]} placeholderTextColor={C.textMuted} placeholder="What's the vibe?" multiline />

        {/* ── Flyer ────────────────────────────────────────────────────── */}
        <View style={{ height: 16 }} />
        <Text style={labelStyle}>Event Flyer / Image</Text>
        <Pressable
          onPress={pickImage}
          style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1,
            borderColor: displayImage ? C.teal + '55' : C.border,
            borderStyle: displayImage ? 'solid' : 'dashed' }}
        >
          {displayImage ? (
            <View>
              <Image source={{ uri: displayImage }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 6, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Tap to change</Text>
              </View>
            </View>
          ) : (
            <View style={{ height: 120, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Text style={{ fontSize: 28 }}>🖼️</Text>
              <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 13 }}>Upload a new flyer</Text>
            </View>
          )}
        </Pressable>
        {imageUri && (
          <Pressable onPress={() => setImageUri(undefined)} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
            <Text style={{ color: C.danger, fontSize: 12, fontWeight: '700' }}>Remove new image</Text>
          </Pressable>
        )}

        {/* ── Date / Time ───────────────────────────────────────────────── */}
        <Text style={sectionLabel}>Date & Time</Text>

        <Text style={labelStyle}>Start date & time</Text>
        <TextInput value={datetimeStart} onChangeText={setDatetimeStart}
          placeholder={Platform.select({ default: '2026-06-01T20:00:00-07:00' })}
          autoCapitalize="none" placeholderTextColor={C.textMuted} style={inputStyle} />

        <View style={{ height: 12 }} />
        <Text style={labelStyle}>End date & time</Text>
        <TextInput value={datetimeEnd} onChangeText={setDatetimeEnd}
          placeholder={Platform.select({ default: '2026-06-02T00:00:00-07:00' })}
          autoCapitalize="none" placeholderTextColor={C.textMuted} style={inputStyle} />

        <View style={{ height: 12 }} />
        <Text style={labelStyle}>Timezone</Text>
        <TextInput value={timezone} onChangeText={setTimezone}
          placeholder="America/Los_Angeles" autoCapitalize="none"
          placeholderTextColor={C.textMuted} style={inputStyle} />

        {/* ── Recurring ─────────────────────────────────────────────────── */}
        <View style={{ height: 20 }} />
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16,
          borderWidth: 1, borderColor: isRecurring ? C.teal + '55' : C.border }}>
          <Pressable onPress={() => setIsRecurring(r => !r)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>Recurring event</Text>
            <View style={{ width: 48, height: 28, borderRadius: 14,
              backgroundColor: isRecurring ? C.teal : C.border, justifyContent: 'center', paddingHorizontal: 3 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                alignSelf: isRecurring ? 'flex-end' : 'flex-start' }} />
            </View>
          </Pressable>
          {isRecurring && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {FREQ_OPTIONS.map(opt => {
                  const active = frequency === opt.value;
                  return (
                    <Pressable key={opt.value} onPress={() => setFrequency(opt.value)}
                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: active ? C.teal : C.navy, borderWidth: 1,
                        borderColor: active ? C.teal : C.border }}>
                      <Text style={{ color: active ? C.navy : C.textSecondary, fontWeight: '700', fontSize: 13 }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ height: 12 }} />
              <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 13 }}>Series end date (optional)</Text>
              <TextInput value={recurringEnd} onChangeText={setRecurringEnd}
                placeholder="YYYY-MM-DD" autoCapitalize="none"
                placeholderTextColor={C.textMuted} style={[inputStyle, { fontSize: 14 }]} />
            </View>
          )}
        </View>

        {/* ── Venue ─────────────────────────────────────────────────────── */}
        <Text style={sectionLabel}>Venue</Text>

        <Text style={labelStyle}>Venue name</Text>
        <TextInput value={venueName} onChangeText={setVenueName} style={inputStyle}
          placeholderTextColor={C.textMuted} placeholder="e.g., The Stud" />

        <View style={{ height: 12 }} />
        <Text style={labelStyle}>Address</Text>
        <TextInput value={venueAddress} onChangeText={setVenueAddress} style={inputStyle}
          placeholderTextColor={C.textMuted} placeholder="Street address" />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 2 }}>
            <Text style={labelStyle}>City</Text>
            <TextInput value={venueCity} onChangeText={setVenueCity} style={inputStyle}
              placeholderTextColor={C.textMuted} placeholder="City" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>State</Text>
            <TextInput value={venueState} onChangeText={setVenueState} style={inputStyle}
              placeholderTextColor={C.textMuted} placeholder="CA" autoCapitalize="characters" maxLength={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Zip</Text>
            <TextInput value={venueZip} onChangeText={setVenueZip} style={inputStyle}
              placeholderTextColor={C.textMuted} placeholder="94103" keyboardType="numeric" maxLength={5} />
          </View>
        </View>

        <View style={{ height: 12 }} />
        <Text style={labelStyle}>Venue Instagram</Text>
        <TextInput value={venueInstagram} onChangeText={setVenueInstagram} style={inputStyle}
          placeholderTextColor={C.textMuted} placeholder="@venue" autoCapitalize="none" />

        {/* ── Tickets ───────────────────────────────────────────────────── */}
        <Text style={sectionLabel}>Ticketing</Text>

        <Text style={labelStyle}>Ticket price ($)</Text>
        <TextInput value={ticketPrice} onChangeText={setTicketPrice} style={inputStyle}
          placeholderTextColor={C.textMuted} placeholder="0 = Free" keyboardType="decimal-pad" />

        <View style={{ height: 12 }} />
        <Text style={labelStyle}>Payout Venmo</Text>
        <TextInput value={payoutVenmo} onChangeText={setPayoutVenmo} style={inputStyle}
          placeholderTextColor={C.textMuted} placeholder="@yourvenmo" autoCapitalize="none" />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Sales start</Text>
            <TextInput value={salesStart} onChangeText={setSalesStart} style={inputStyle}
              placeholderTextColor={C.textMuted} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Sales end</Text>
            <TextInput value={salesEnd} onChangeText={setSalesEnd} style={inputStyle}
              placeholderTextColor={C.textMuted} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </View>
        </View>

        {/* ── Promote ──────────────────────────────────────────────────── */}
        <Text style={sectionLabel}>Visibility</Text>
        <View style={{
          backgroundColor: isPromoted ? GOLD + '14' : C.surface,
          borderRadius: 14,
          borderWidth: isPromoted ? 2 : 1,
          borderColor: isPromoted ? GOLD : C.border,
          padding: 16,
          marginTop: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>✦</Text>
              <Text style={{ color: isPromoted ? GOLD : C.textPrimary, fontWeight: '900', fontSize: 15 }}>
                Promote this event
              </Text>
            </View>
            <Switch
              value={isPromoted}
              onValueChange={setIsPromoted}
              trackColor={{ false: C.border, true: GOLD + 'AA' }}
              thumbColor={isPromoted ? GOLD : C.textMuted}
              ios_backgroundColor={C.border}
            />
          </View>
          <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 19 }}>
            Promoted events get a gold border and{' '}
            <Text style={{ color: isPromoted ? GOLD : C.textMuted, fontWeight: '700' }}>✦ Promoted</Text>
            {' '}badge in Discover — putting your event in front of more fans.
          </Text>
        </View>

        {/* ── Errors ───────────────────────────────────────────────────── */}
        {errors.length > 0 && (
          <Text style={{ color: C.danger, marginTop: 16 }}>{errors.join(' ')}</Text>
        )}

        {/* ── Save ─────────────────────────────────────────────────────── */}
        <View style={{ height: 28 }} />
        {saving ? (
          <ActivityIndicator color={C.teal} />
        ) : (
          <PrimaryButton title="Save Changes" onPress={handleSave} />
        )}
        <View style={{ height: 12 }} />
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>
            Cancel
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
