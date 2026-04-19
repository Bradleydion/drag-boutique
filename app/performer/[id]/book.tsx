// app/performer/[id]/book.tsx
// Booking / commission request form. Saves to Supabase `booking_requests` table.
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getEmail, getSession, isGuest } from '../../../lib/authStore';
import { supabase } from '../../../lib/supabase';
import { colors as C } from '../../../src/theme/colors';

type RequestType = 'booking' | 'commission';

export default function BookingForm() {
  const { id: performerId, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const requestType: RequestType = type === 'commission' ? 'commission' : 'booking';

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState(getEmail() ?? '');
  const [eventDate, setEventDate] = useState('');
  const [message,   setMessage]   = useState('');
  const [sending,   setSending]   = useState(false);

  const title = requestType === 'commission' ? 'Request Commission' : 'Request Booking';
  const messagePlaceholder = requestType === 'commission'
    ? 'Describe what you have in mind — theme, deadline, budget…'
    : 'Tell them about your event — venue, date, vibe, expected attendance…';

  async function handleSend() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name.'); return; }
    if (!message.trim()) { Alert.alert('Required', 'Please include a message.'); return; }

    const session = getSession();
    if (isGuest() || !session) {
      Alert.alert(
        'Sign in required',
        'You need an account to send booking requests.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/auth') },
        ],
      );
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('booking_requests').insert({
        performer_id:   performerId,
        requester_id:   session.user.id,
        requester_name: name.trim(),
        requester_email: email.trim(),
        message:        message.trim(),
        event_date:     eventDate.trim() || null,
        request_type:   requestType,
        status:         'pending',
      });

      if (error) throw error;

      Alert.alert(
        '✅ Request Sent!',
        'Your request has been sent. The artist will be in touch if they\'re available.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send request. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const inputStyle = {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    color: C.textPrimary,
    marginTop: 6,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: C.navy },
          headerTintColor: C.teal,
          headerTitleStyle: { color: C.textPrimary },
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900' }}>{title}</Text>
        <Text style={{ color: C.textMuted, marginTop: 4, marginBottom: 24, lineHeight: 20 }}>
          {requestType === 'commission'
            ? 'Describe the custom piece you want created. The artist will follow up with availability and pricing.'
            : 'Fill in the details below and the artist will reach out if they\'re available for your event.'}
        </Text>

        {/* Name */}
        <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 14 }}>Your Name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your full name or handle"
          placeholderTextColor={C.textMuted}
          style={inputStyle}
        />

        {/* Email */}
        <View style={{ height: 14 }} />
        <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 14 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={inputStyle}
        />

        {/* Event date — only for bookings */}
        {requestType === 'booking' && (
          <>
            <View style={{ height: 14 }} />
            <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 14 }}>Event Date (optional)</Text>
            <TextInput
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="e.g. June 14, 2026 or flexible"
              placeholderTextColor={C.textMuted}
              style={inputStyle}
            />
          </>
        )}

        {/* Message */}
        <View style={{ height: 14 }} />
        <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 14 }}>Message *</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={messagePlaceholder}
          placeholderTextColor={C.textMuted}
          multiline
          style={[inputStyle, { minHeight: 120 }]}
        />

        {/* Info card */}
        <View style={{ marginTop: 20, backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ color: C.textMuted, fontSize: 12, lineHeight: 18 }}>
            💡 Requests are sent directly to the artist. Response times vary — most artists reply within a few days. Payment is arranged between you and the artist.
          </Text>
        </View>

        <View style={{ height: 24 }} />
        {sending ? (
          <ActivityIndicator color={C.teal} />
        ) : (
          <PrimaryButton title="Send Request" onPress={handleSend} />
        )}
        <View style={{ height: 12 }} />
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
