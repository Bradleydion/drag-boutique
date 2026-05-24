// app/performer/create.tsx
// New artist profile creation screen.
// Accessible from onboarding (artist role) or Profile tab → "Become an Artist" CTA.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RolePicker, type SelectedRole } from '../../components/RolePicker';
import { getSession, isGuest } from '../../lib/authStore';
import { createPerformerProfile, saveTalentRoles } from '../../lib/performerStore';
import { colors as C } from '../../src/theme/colors';

// Commission categories — shown as chips when "Accept Commissions" is toggled on.
const COMMISSION_TYPES: { id: string; label: string }[] = [
  { id: 'costume',      label: 'Costumes & Looks' },
  { id: 'wig',          label: 'Wig Styling' },
  { id: 'makeup',       label: 'Makeup Lessons' },
  { id: 'drag_lessons', label: 'Drag Lessons' },
  { id: 'hosting',      label: 'Hosting / MC' },
  { id: 'choreography', label: 'Choreography' },
  { id: 'content',      label: 'Photo / Video' },
  { id: 'performance',  label: 'Live Performance' },
];

export default function CreateArtistProfile() {
  const [saving, setSaving] = useState(false);

  const [stageName,         setStageName]         = useState('');
  const [bio,               setBio]               = useState('');
  const [bookingInfo,       setBookingInfo]       = useState('');
  const [venmoHandle,       setVenmoHandle]       = useState('');
  const [instagramUrl,      setInstagramUrl]      = useState('');
  const [tiktokUrl,         setTiktokUrl]         = useState('');
  const [websiteUrl,        setWebsiteUrl]        = useState('');
  const [commissionsOn,     setCommissionsOn]     = useState(false);
  const [commissionTypes,   setCommissionTypes]   = useState<string[]>([]);
  const [commissionBlurb,   setCommissionBlurb]   = useState('');
  const [commissionPricing, setCommissionPricing] = useState('');
  const [phone,             setPhone]             = useState('');
  const [photoUri,          setPhotoUri]          = useState<string | undefined>();
  const [selectedRoles,     setSelectedRoles]     = useState<SelectedRole[]>([]);

  // True if the user is a guest or has no active Supabase session.
  // Supabase INSERT policies require authenticated; we gate the form rather than
  // letting them fill everything out and hit an error on submit.
  const needsAuth = !getSession() || isGuest();

  function toggleCommissionType(id: string) {
    setCommissionTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id],
    );
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to add a profile photo.');
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

  async function handleCreate() {
    // Redirect to auth first if not signed in.
    if (needsAuth) {
      router.push('/auth');
      return;
    }
    if (!stageName.trim()) {
      Alert.alert('Required', 'Stage name is required.');
      return;
    }
    setSaving(true);
    try {
      // Merge selected commission types into the blurb field so we don't need
      // a schema change. Format: "Types: Wig Styling, Costumes\n\n{details}"
      let blurb = commissionBlurb.trim();
      if (commissionsOn && commissionTypes.length > 0) {
        const typesList = commissionTypes
          .map(id => COMMISSION_TYPES.find(t => t.id === id)?.label ?? id)
          .join(', ');
        blurb = `Types: ${typesList}${blurb ? '\n\n' + blurb : ''}`;
      }

      const profile = await createPerformerProfile({
        stageName:          stageName.trim(),
        bio:                bio.trim() || undefined,
        photoLocalUri:      photoUri,
        bookingInfo:        bookingInfo.trim() || undefined,
        venmoHandle:        venmoHandle.trim().replace(/^@/, '') || undefined,
        instagramUrl:       instagramUrl.trim() || undefined,
        tiktokUrl:          tiktokUrl.trim() || undefined,
        websiteUrl:         websiteUrl.trim() || undefined,
        commissionsEnabled: commissionsOn,
        commissionBlurb:    commissionsOn ? (blurb || undefined) : undefined,
        commissionPricing:  commissionsOn ? (commissionPricing.trim() || undefined) : undefined,
        phone:              phone.trim() || undefined,
      });

      if (selectedRoles.length > 0) {
        await saveTalentRoles(profile.id, selectedRoles);
      }

      Alert.alert('🎉 Profile Created!', 'Your talent profile is now live on Sequins.', [
        { text: 'View My Profile', onPress: () => router.replace(`/performer/${profile.id}` as any) },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not create profile. Please try again.');
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
    fontSize: 15,
  } as const;

  const labelStyle = { color: C.textPrimary, fontWeight: '800' as const, fontSize: 14 };
  const sectionLabel = {
    color: C.textMuted, fontSize: 11, fontWeight: '700' as const,
    textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 12,
  };

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile' as any);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Create Talent Profile',
          headerStyle: { backgroundColor: C.navy },
          headerTintColor: C.teal,
          headerTitleStyle: { color: C.textPrimary },
          headerLeft: () => (
            <Pressable onPress={goBack} hitSlop={12} style={{ paddingRight: 8 }}>
              <Ionicons name="chevron-back" size={26} color={C.teal} />
            </Pressable>
          ),
        }}
      />

      {/* KeyboardAvoidingView ensures inputs near the bottom aren't hidden by
          the software keyboard, especially on Android. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Auth gate banner ──────────────────────────────────────── */}
          {needsAuth && (
            <Pressable
              onPress={() => router.push('/auth')}
              style={{
                backgroundColor: C.teal + '18',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: C.teal + '55',
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 22 }}>🔐</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.teal, fontWeight: '800', fontSize: 14 }}>
                  Sign in to save your profile
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                  Fill everything out first — tap here or the button below to sign in.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.teal} />
            </Pressable>
          )}

          <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900' }}>
            Build your talent profile
          </Text>
          <Text style={{ color: C.textMuted, marginTop: 4, marginBottom: 24, lineHeight: 20 }}>
            Your public page where fans can follow you, hosts can book you, and everyone can find your upcoming shows.
          </Text>

          {/* ── Profile photo ─────────────────────────────────────────── */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Pressable onPress={pickPhoto} style={{ alignItems: 'center' }}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: C.teal }}
                />
              ) : (
                <View style={{
                  width: 120, height: 120, borderRadius: 60,
                  backgroundColor: C.surface,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: C.border, borderStyle: 'dashed',
                }}>
                  <Ionicons name="camera" size={40} color={C.textMuted} />
                </View>
              )}
              <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="camera-outline" size={14} color={C.teal} />
                <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13 }}>
                  {photoUri ? 'Change Photo' : 'Add Profile Photo'}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ── Basics ────────────────────────────────────────────────── */}
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
            placeholder="Who are you? What's your vibe?"
            placeholderTextColor={C.textMuted}
            multiline
            style={[inputStyle, { minHeight: 96, textAlignVertical: 'top' }]}
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

          {/* ── Roles ─────────────────────────────────────────────────── */}
          <View style={{ height: 24 }} />
          <Text style={sectionLabel}>What you do</Text>
          <Text style={labelStyle}>Talent Roles</Text>
          <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2, marginBottom: 10 }}>
            Select every role you're confident filling. Long-press to set your primary.
          </Text>
          <RolePicker selected={selectedRoles} onChange={setSelectedRoles} />

          {/* ── Payments ──────────────────────────────────────────────── */}
          <View style={{ height: 24 }} />
          <Text style={sectionLabel}>Payments</Text>

          <Text style={labelStyle}>Phone (for host contact)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 503 555 0100"
            placeholderTextColor={C.textMuted}
            keyboardType="phone-pad"
            style={inputStyle}
          />
          <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>
            Only visible to hosts who book you. Used for SMS/WhatsApp coordination.
          </Text>

          <View style={{ height: 14 }} />
          <Text style={labelStyle}>Venmo Handle (for tips)</Text>
          <TextInput
            value={venmoHandle}
            onChangeText={setVenmoHandle}
            placeholder="yourvenmohandle (no @)"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            style={inputStyle}
          />

          {/* ── Social links ──────────────────────────────────────────── */}
          <View style={{ height: 24 }} />
          <Text style={sectionLabel}>Social Links (optional)</Text>

          <Text style={labelStyle}>Instagram</Text>
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
          <Text style={labelStyle}>TikTok</Text>
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

          {/* ── Commissions ───────────────────────────────────────────── */}
          <View style={{ height: 24 }} />
          <View style={{
            backgroundColor: C.surface, borderRadius: 14, padding: 16,
            borderWidth: 1, borderColor: commissionsOn ? C.teal + '55' : C.border,
          }}>
            {/* Toggle row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
                  Accept Commissions
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                  Fans can request custom work from you
                </Text>
              </View>
              <Switch
                value={commissionsOn}
                onValueChange={setCommissionsOn}
                trackColor={{ false: C.border, true: C.teal }}
                thumbColor="#fff"
              />
            </View>

            {/* Commission details — only visible when toggled on */}
            {commissionsOn && (
              <View style={{ marginTop: 16, gap: 14 }}>

                {/* Type chips */}
                <View>
                  <Text style={{
                    color: C.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: 10,
                  }}>
                    What you offer (select all that apply)
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {COMMISSION_TYPES.map(type => {
                      const isSelected = commissionTypes.includes(type.id);
                      return (
                        <Pressable
                          key={type.id}
                          onPress={() => toggleCommissionType(type.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 20,
                            borderWidth: 1.5,
                            borderColor: isSelected ? C.teal : C.border,
                            backgroundColor: isSelected ? C.teal + '18' : 'transparent',
                          }}
                        >
                          <Text style={{
                            color: isSelected ? C.teal : C.textMuted,
                            fontSize: 13,
                            fontWeight: isSelected ? '700' : '400',
                          }}>
                            {type.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Free-text details */}
                <View>
                  <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
                    Details (optional)
                  </Text>
                  <TextInput
                    value={commissionBlurb}
                    onChangeText={setCommissionBlurb}
                    placeholder="e.g. DMs open! Turnaround 2–3 weeks."
                    placeholderTextColor={C.textMuted}
                    style={inputStyle}
                  />
                </View>

                {/* Pricing */}
                <View>
                  <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
                    Pricing notes
                  </Text>
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

          {/* ── Submit ────────────────────────────────────────────────── */}
          <View style={{ height: 28 }} />
          {saving ? (
            <ActivityIndicator color={C.teal} />
          ) : needsAuth ? (
            <Pressable
              onPress={() => router.push('/auth')}
              style={{
                backgroundColor: C.teal,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: C.navy, fontWeight: '900', fontSize: 17 }}>
                Sign In to Save Profile →
              </Text>
            </Pressable>
          ) : (
            <PrimaryButton title="Create My Talent Profile ✦" onPress={handleCreate} />
          )}

          <View style={{ height: 12 }} />
          <Pressable onPress={goBack} accessibilityRole="button">
            <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>
              Not now
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
