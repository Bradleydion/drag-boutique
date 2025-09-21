// app/event/create/basics.tsx
import { useState, useMemo } from 'react';
import { Stack, router } from 'expo-router';
import { View, Text, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getDraft, updateDraft } from '@/lib/createEventStore';

const colors = { bg: '#FFEB99', text: '#000', sub: '#333', muted: '#555' };

export default function CreateEventBasics() {
  const initial = getDraft();
  const [title, setTitle] = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  const [startISO, setStartISO] = useState(initial.datetimeStart || '');
  const [endISO, setEndISO] = useState(initial.datetimeEnd || '');
  const [timezone, setTimezone] = useState(initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!title.trim()) e.push('Title is required.');
    if (startISO && endISO) {
      const s = new Date(startISO).getTime();
      const eMs = new Date(endISO).getTime();
      if (!Number.isNaN(s) && !Number.isNaN(eMs) && eMs <= s) e.push('End must be after start.');
    }
    return e;
  }, [title, startISO, endISO]);

  function onNext() {
    updateDraft({ title, description, datetimeStart: startISO || undefined, datetimeEnd: endISO || undefined, timezone });
    router.push('/event/create/venue');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: 'Create Event • Basics' }} />
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>Event basics</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>These details appear on the event page.</Text>

        <View style={{ height: 16 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Title *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Queen of the Night"
          placeholderTextColor="#666"
          style={{ backgroundColor: '#fff3c2', borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What’s the vibe?"
          placeholderTextColor="#666"
          multiline
          style={{ backgroundColor: '#fff3c2', borderRadius: 10, padding: 12, color: '#000', marginTop: 6, minHeight: 90 }}
        />

        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Start (ISO)</Text>
        <TextInput
          value={startISO}
          onChangeText={setStartISO}
          placeholder="2025-10-31T20:00:00-07:00"
          placeholderTextColor="#666"
          autoCapitalize="none"
          style={{ backgroundColor: '#fff3c2', borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>End (ISO)</Text>
        <TextInput
          value={endISO}
          onChangeText={setEndISO}
          placeholder="2025-11-01T00:00:00-07:00"
          placeholderTextColor="#666"
          autoCapitalize="none"
          style={{ backgroundColor: '#fff3c2', borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        <View style={{ height: 14 }} />
        <Text style={{ color: colors.text, fontWeight: '800' }}>Timezone</Text>
        <TextInput
          value={timezone}
          onChangeText={setTimezone}
          placeholder={Platform.select({ ios: 'America/Los_Angeles', android: 'America/Los_Angeles', default: 'America/Los_Angeles' })}
          placeholderTextColor="#666"
          autoCapitalize="none"
          style={{ backgroundColor: '#fff3c2', borderRadius: 10, padding: 12, color: '#000', marginTop: 6 }}
        />

        {errors.length > 0 ? (
          <Text style={{ color: '#8b0000', marginTop: 12 }}>{errors.join(' ')}</Text>
        ) : null}

        <View style={{ height: 20 }} />
        <PrimaryButton title="Next: Venue" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}
