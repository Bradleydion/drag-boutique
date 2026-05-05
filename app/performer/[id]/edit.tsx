// app/performer/[id]/edit.tsx
// Profile edit screen — only reachable by the profile owner.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import {
  fetchPerformerById,
  updatePerformerProfile,
  type PerformerRecord,
} from '../../../lib/performerStore';
import { colors as C } from '../../../src/theme/colors';

export default function EditPerformerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // Form fields
  const [stageName,         setStageName]         = useState('');
  const [bio,               setBio]               = useState('');
  const [bookingInfo,       setBookingInfo]       = useState('');
  const [venmoHandle,       setVenmoHandle]       = useState('');
  const [instagramUrl,      setInstagramUrl]      = useState('');
  const [tiktokUrl,         setTiktokUrl]         = useState('');
  const [websiteUrl,        setWebsiteUrl]        = useState('');
  const [commissionsOn,     setCommissionsOn]     = useState(false);
  const [commissionBlurb,   setCommissionBlurb]   = useState('');
  const [commissionPricing, setCommissionPricing] = useState('');
  const [isPromoted,        setIsPromoted]        = useState(false);
  const [photoUri,          setPhotoUri]          = useState<string | undefined>();
  const [existingPhotoUrl,  setExistingPhotoUrl]  = useState<string | undefined>();

  const GOLD = '#F59E0B';

  // Load current profile values
  useEffect(() => {
    if (!id) return;
    fetchPerformerById(id).then((p: PerformerRecord | null) => {
      if (!p) { router.back(); return; }
      setStageName(p.stageName ?? '');
      setBio(p.bio ?? '');
      setBookingInfo(p.bookingInfo ?? '');
      setVenmoHandle(p.venmoHandle ?? '');
      setInstagramUrl(p.instagramUrl ?? '');
      setTiktokUrl(p.tiktokUrl ?? '');
      setWebsiteUrl(p.websiteUrl ?? '');
      setCommissionsOn(p.commissionsEnabled ?? false);
      setCommissionBlurb(p.commissionBlurb ?? '');
      setCommissionPricing(p.commissionPricing ?? '');
      setIsPromoted(p.isPromoted ?? false);
      setExistingPhotoUrl(p.photoUrl);
      setLoading(false);
    });
  }, [id]);

  // ── Photo picker ──────────────────────────────────────────────────────────

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to update your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!stageName.trim()) {
      Alert.alert('Required', 'Stage name cannot be empty.');
      return;
    }
    if (!id) return;
    setSaving(true);
    try {
      await updatePerformerProfile(id, {
        stageName:          stageName.trim(),
        bio:                bio.trim() || undefined,
        photoLocalUri:      photoUri,
        bookingInfo:        bookingInfo.trim() || undefined,
        venmoHandle:        venmoHandle.trim().replace(/^@/, '') || undefined,
        instagramUrl:       instagramUrl.trim() || undefined,
        tiktokUrl:          tiktokUrl.trim() || undefined,
        websiteUrl:         websiteUrl.trim() || undefined,
        commissionsEnabled: commissionsOn,
        commissionBlurb:    commissionsOn ? (commissionBlurb.trim() || undefined) : undefined,
        commissionPricing:  commissionsOn ? (commissionPricing.trim() || undefined) : undefined,
        isPromoted,
      });
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inputStyle = {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    color: C.textPrimary,
    marginTop: 6,
    fontSize: 15,
  } as const;

  const labelStyle = { color: C.textPrimary, fontWeight: '800' as const, fontSize: 14 };
  const sectionLabel = { color: C.textMuted, fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 12 };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <Stack.Screen options={{ title: 'Edit Profile', headerBackTitle: 'Back', headerStyle: { backgroundColor: C.navy }, headerTintColor: C.teal, headerTitleStyle: { color: C.textPrimary } }} />
        <ActivityIndicator color={C.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const displayPhoto = photoUri ?? existingPhotoUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: C.navy },
          headerTintColor: C.teal,
          headerTitleStyle: { color: C.textPrimary },
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* ── Profile photo ─────────────────────────────────────────────── */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Pressable onPress={pickPhoto} style={{ alignItems: 'center' }}>
            {displayPhoto ? (
              <Image
                source={{ uri: displayPhoto }}
                style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: C.teal }}
              />
            ) : (
              <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, borderStyle: 'dashed' }}>
                <Ionicons name="camera" size={36} color={C.textMuted} />
              </View>
            )}
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="camera-outline" size={14} color={C.teal} />
              <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13 }}>
                {displayPhoto ? 'Change Photo' : 'Add Photo'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ── Basics ───────────────────────────────────────────────────── */}
        <Text style={sectionLabel}>Basics</Text>

        <Text style={labelStyle}>Stage Name *</Text>
        <TextInput
          value={stageName}
          onChangeText={setStageName}
          placeholder="Your stage name"
          placeholderTextColor={C.textMuted}
          style={inputStyle}
        />

        <View style={{ height: 14 }} />
        <Text style={labelStyle}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell fans who you are…"
          placeholderTextColor={C.textMuted}
          multiline
          style={[inputStyle, { minHeight: 96 }]}
        />

        <View style={{ height: 14 }} />
        <Text style={labelStyle}>Location / Booking Info</Text>
        <TextInput
          value={bookingInfo}
          onChangeText={setBookingInfo}
          placeholder="e.g. Portland-based. Travel negotiable."
          placeholderTextColor={C.textMuted}
          style={inputStyle}
        />

        {/* ── Payments ─────────────────────────────────────────────────── */}
        <View style={{ height: 24 }} />
        <Text style={sectionLabel}>Payments</Text>

        <Text style={labelStyle}>Venmo Handle</Text>
        <TextInput
          value={venmoHandle}
          onChangeText={setVenmoHandle}
          placeholder="yourvenmohandle (no @)"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          style={inputStyle}
        />

        {/* ── Social links ─────────────────────────────────────────────── */}
        <View style={{ height: 24 }} />
        <Text style={sectionLabel}>Social Links</Text>

        <Text style={labelStyle}>Instagram URL</Text>
        <TextInput
          value={instagramUrl}
          onChangeText={setInstagramUrl}
          placeholder="https://instagram.com/yourhandle"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          style={inputStyle}
        />

        <View style={{ height: 14 }} />
        <Text style={labelStyle}>TikTok URL</Text>
        <TextInput
          value={tiktokUrl}
          onChangeText={setTiktokUrl}
          placeholder="https://tiktok.com/@yourhandle"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          style={inputStyle}
        />

        <View style={{ height: 14 }} />
        <Text style={labelStyle}>Website</Text>
        <TextInput
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://yourwebsite.com"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          style={inputStyle}
        />

        {/* ── Commissions ──────────────────────────────────────────────── */}
        <View style={{ height: 24 }} />
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: commissionsOn ? C.teal + '55' : C.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>Commissions</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>Accept custom orders from fans</Text>
            </View>
            <Switch
              value={commissionsOn}
              onValueChange={setCommissionsOn}
              trackColor={{ false: C.border, true: C.teal }}
              thumbColor="#fff"
            />
          </View>

          {commissionsOn && (
            <View style={{ marginTop: 16, gap: 12 }}>
              <View>
                <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>What you offer</Text>
                <TextInput
                  value={commissionBlurb}
                  onChangeText={setCommissionBlurb}
                  placeholder="e.g. Custom wig styling + costumes"
                  placeholderTextColor={C.textMuted}
                  style={inputStyle}
                />
              </View>
              <View>
                <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>Pricing notes</Text>
                <TextInput
                  value={commissionPricing}
                  onChangeText={setCommissionPricing}
                  placeholder="e.g. Starting at $150"
                  placeholderTextColor={C.textMuted}
                  style={inputStyle}
                />
              </View>
            </View>
          )}
        </View>

        {/* ── Promote ──────────────────────────────────────────────────── */}
        <View style={{ height: 24 }} />
        <View style={{
          backgroundColor: isPromoted ? GOLD + '14' : C.surface,
          borderRadius: 14,
          borderWidth: isPromoted ? 2 : 1,
          borderColor: isPromoted ? GOLD : C.border,
          padding: 16,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>✦</Text>
              <View>
                <Text style={{ color: isPromoted ? GOLD : C.textPrimary, fontWeight: '900', fontSize: 15 }}>
                  Promote my profile
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>Gold ring on your avatar</Text>
              </View>
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
            Promoted performers get a{' '}
            <Text style={{ color: isPromoted ? GOLD : C.textMuted, fontWeight: '700' }}>✦ gold ring</Text>
            {' '}around their avatar when tagged in events — making you easier to spot in Discover.
          </Text>
        </View>

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
