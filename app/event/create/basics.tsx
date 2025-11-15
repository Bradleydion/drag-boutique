// app/event/create/basics.tsx
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getDraft, updateDraft } from '../../../lib/createEventStore';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Button, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = { bg: '#FFEB99', text: '#000', sub: '#333', muted: '#555', field: '#fff3c2' };

export default function CreateEvent_Basics() {
  // Load any existing draft so this screen is resumable
  const draft = getDraft();

  const [title, setTitle] = useState(draft.title ?? '');
  const [description, setDescription] = useState(draft.description ?? '');
  const [datetimeStart, setDatetimeStart] = useState(draft.datetimeStart ?? '');
  const [datetimeEnd, setDatetimeEnd] = useState(draft.datetimeEnd ?? '');
  const [timezone, setTimezone] = useState(
    draft.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!title.trim()) e.push('Title is required.');
    if (datetimeStart && datetimeEnd) {
      const s = Date.parse(datetimeStart);
      const eMs = Date.parse(datetimeEnd);
      if (!Number.isNaN(s) && !Number.isNaN(eMs) && eMs <= s) {
        e.push('End time must be after start time.');
      }
    }
    return e;
  }, [title, datetimeStart, datetimeEnd]);

  function onNext() {
    updateDraft({ title, description, datetimeStart, datetimeEnd, timezone });
    router.push('/event/create/venue');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: 'Create Event • Basics',
          headerLeft: () => <Button title="Back" onPress={() => router.back()} />,
        }}
      />

      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>Event basics</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          These details appear on the public event page.
        </Text>

        {/* Title */}
        <View style={{ height: 16 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Title *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Queen of the Night"
          placeholderTextColor="#666"
          autoCapitalize="sentences"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        {/* Description */}
        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What’s the vibe? Hosts, themes, highlights…"
          placeholderTextColor="#666"
          multiline
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6, minHeight: 96 }}
        />

        {/* Start */}
        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Start (ISO)</Text>
        <TextInput
          value={datetimeStart}
          onChangeText={setDatetimeStart}
          placeholder={
            Platform.select({
              ios: '2025-10-31T20:00:00-07:00',
              android: '2025-10-31T20:00:00-07:00',
              default: '2025-10-31T20:00:00-07:00',
            })
          }
          autoCapitalize="none"
          placeholderTextColor="#666"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        {/* End */}
        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>End (ISO)</Text>
        <TextInput
          value={datetimeEnd}
          onChangeText={setDatetimeEnd}
          placeholder={
            Platform.select({
              ios: '2025-11-01T00:00:00-07:00',
              android: '2025-11-01T00:00:00-07:00',
              default: '2025-11-01T00:00:00-07:00',
            })
          }
          autoCapitalize="none"
          placeholderTextColor="#666"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        {/* Timezone */}
        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Timezone</Text>
        <TextInput
          value={timezone}
          onChangeText={setTimezone}
          placeholder={Platform.select({ ios: 'America/Los_Angeles', android: 'America/Los_Angeles', default: 'America/Los_Angeles' })}
          autoCapitalize="none"
          placeholderTextColor="#666"
          style={{ backgroundColor: colors.field, borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        {/* Errors */}
        {errors.length > 0 ? (
          <Text style={{ color: '#8b0000', marginTop: 12 }}>{errors.join(' ')}</Text>
        ) : null}

        {/* Next */}
        <View style={{ height: 20 }} />
        <PrimaryButton title="Next: Venue" onPress={onNext} />
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
