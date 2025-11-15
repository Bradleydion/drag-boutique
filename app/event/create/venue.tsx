// app/event/create/venue.tsx
import * as Linking from 'expo-linking';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Button, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getDraft, updateDraft } from '../../../lib/createEventStore';

const colors = { bg: '#FFEB99', text: '#000', sub: '#333', muted: '#555', field: '#fff3c2' };

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: 'Create Event • Venue',
          headerLeft: () => <Button title="Back" onPress={() => router.back()} />,
        }}
      />

      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>Venue details</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          Add the location so fans can get directions.
        </Text>

        {/* Venue name */}
        <View style={{ height: 16 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Venue name</Text>
        <TextInput
          value={venueName}
          onChangeText={setVenueName}
          placeholder="Club Nebula"
          placeholderTextColor="#666"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        {/* Address */}
        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Street address</Text>
        <TextInput
          value={venueAddress}
          onChangeText={setVenueAddress}
          placeholder="123 Main St"
          placeholderTextColor="#666"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>City</Text>
            <TextInput
              value={venueCity}
              onChangeText={setVenueCity}
              placeholder="Los Angeles"
              placeholderTextColor="#666"
              style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
            />
          </View>
          <View style={{ width: 100 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>State</Text>
            <TextInput
              value={venueState}
              onChangeText={setVenueState}
              placeholder="CA"
              placeholderTextColor="#666"
              autoCapitalize="characters"
              maxLength={2}
              style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
            />
          </View>
          <View style={{ width: 110 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>ZIP</Text>
            <TextInput
              value={venueZip}
              onChangeText={setVenueZip}
              placeholder="90012"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={10}
              style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
            />
          </View>
        </View>

        {/* Instagram (optional) */}
        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Instagram (optional)</Text>
        <TextInput
          value={venueInstagram}
          onChangeText={setVenueInstagram}
          placeholder="https://instagram.com/yourvenue"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="url"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        {/* Map preview */}
        <View style={{ height: 16 }} />
        <PrimaryButton
          title="Open in Maps"
          onPress={() => {
            if (!canPreview) return;
            const url = buildMapsUrl(venueAddress, venueCity, venueState, venueZip);
            Linking.openURL(url).catch(() => {});
          }}
        />

        {/* Next / Cancel */}
        <View style={{ height: 16 }} />
        <PrimaryButton title="Next: Ticketing" onPress={onNext} />
        <View style={{ height: 12 }} />
        <Pressable onPress={() => router.replace('/')} accessibilityRole="button">
          <Text style={{ color: '#333', textAlign: 'center', textDecorationLine: 'underline' }}>
            Cancel and go back
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
