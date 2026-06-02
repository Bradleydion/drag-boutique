// app/event/create/venue.tsx
import * as Linking from 'expo-linking';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getDraft, updateDraft } from '../../../lib/createEventStore';
import { colors as C } from '../../../src/theme/colors';

const s = { bg: C.navy, text: C.textPrimary, muted: C.textMuted, field: C.surface };

function buildMapsUrl(addr?: string, city?: string, state?: string, zip?: string) {
  const parts = [addr, city, state, zip].filter(Boolean).join(', ');
  const q = encodeURIComponent(parts);
  // Apple Maps scheme works on iOS; Google Maps app/web will also intercept
  return `https://maps.apple.com/?q=${q}`;
}

export default function CreateEvent_Venue() {
  const d = getDraft();

  const [venueName, setVenueName] = useState(d.venueName ?? '');
  const [venueAddress, setVenueAddress] = useState(d.venueAddress ?? '');
  const [venueCity, setVenueCity] = useState(d.venueCity ?? '');
  const [venueState, setVenueState] = useState(d.venueState ?? '');
  const [venueZip, setVenueZip] = useState(d.venueZip ?? '');
  const [venueInstagram, setVenueInstagram] = useState(d.venueInstagram ?? '');

  const canPreview = !!(venueAddress || venueCity || venueState || venueZip);

  function onNext() {
    updateDraft({
      venueName,
      venueAddress,
      venueCity,
      venueState,
      venueZip,
      venueInstagram,
    });
    router.push('/event/create/ticketing');
  }

  const inputStyle = { backgroundColor: s.field, borderRadius: 10, padding: 12, color: s.text, marginTop: 6 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: s.bg }}>
      <Stack.Screen
        options={{
          title: 'Create Event • Venue',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
        }}
      />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: s.text, fontSize: 22, fontWeight: '900' }}>Venue details</Text>
        <Text style={{ color: s.muted, marginTop: 4 }}>Add the location so fans can get directions.</Text>

        <View style={{ height: 16 }} />
        <Text style={{ color: s.text, fontWeight: '800' }}>Venue name</Text>
        <TextInput
          value={venueName} onChangeText={setVenueName}
          placeholder="Club Nebula" placeholderTextColor={C.textMuted}
          style={inputStyle}
        />

        <View style={{ height: 14 }} />
        <Text style={{ color: s.text, fontWeight: '800' }}>Street address</Text>
        <TextInput
          value={venueAddress} onChangeText={setVenueAddress}
          placeholder="123 Main St" placeholderTextColor={C.textMuted}
          style={inputStyle}
        />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: s.text, fontWeight: '800' }}>City</Text>
            <TextInput value={venueCity} onChangeText={setVenueCity} placeholder="Portland" placeholderTextColor={C.textMuted} style={inputStyle} />
          </View>
          <View style={{ width: 80 }}>
            <Text style={{ color: s.text, fontWeight: '800' }}>State</Text>
            <TextInput value={venueState} onChangeText={setVenueState} placeholder="OR" placeholderTextColor={C.textMuted} autoCapitalize="characters" maxLength={2} style={inputStyle} />
          </View>
          <View style={{ width: 100 }}>
            <Text style={{ color: s.text, fontWeight: '800' }}>ZIP</Text>
            <TextInput value={venueZip} onChangeText={setVenueZip} placeholder="97201" placeholderTextColor={C.textMuted} keyboardType="number-pad" maxLength={10} style={inputStyle} />
          </View>
        </View>

        <View style={{ height: 14 }} />
        <Text style={{ color: s.text, fontWeight: '800' }}>Venue Instagram (optional)</Text>
        <TextInput
          value={venueInstagram} onChangeText={setVenueInstagram}
          placeholder="https://instagram.com/yourvenue"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none" keyboardType="url"
          style={inputStyle}
        />

        <View style={{ height: 20 }} />
        <PrimaryButton
          title="Preview in Maps"
          variant="ghost"
          onPress={() => {
            if (!canPreview) return;
            const url = buildMapsUrl(venueAddress, venueCity, venueState, venueZip);
            Linking.openURL(url).catch(() => {});
          }}
        />
        <View style={{ height: 12 }} />
        <PrimaryButton title="Next: Ticketing →" onPress={onNext} />
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
