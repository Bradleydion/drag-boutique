// app/event/create/_layout.tsx
import { Stack } from 'expo-router';

export default function CreateEventLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFEB99' },
        headerTitleStyle: { color: '#000' },
        headerTintColor: '#000',
        contentStyle: { backgroundColor: '#FFEB99' },
      }}
    >
      <Stack.Screen name="basics" options={{ title: 'Create Event • Basics' }} />
      <Stack.Screen name="venue" options={{ title: 'Create Event • Venue' }} />
    </Stack>
  );
}

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

// app/event/create/venue.tsx
import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateEventVenue() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFEB99' }}>
      <Stack.Screen options={{ title: 'Create Event • Venue' }} />
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#000', fontSize: 22, fontWeight: '900' }}>Venue (placeholder)</Text>
        <Text style={{ color: '#333', marginTop: 6 }}>We will build this next.</Text>
      </View>
    </SafeAreaView>
  );
}

// app/event/[id].tsx
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Image, Pressable } from 'react-native';
import { events, performers } from '@/data/events';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AdSlot } from '@/components/AdSlot';
import { openVenmoPay } from '@/lib/venmo';

const colors = { bg: '#FFEB99', text: '#000', sub: '#333', muted: '#555' };

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ev = events.find((e) => e.id === id);

  if (!ev) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack.Screen options={{ title: 'Event' }} />
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text }}>Event not found.</Text>
          <View style={{ height: 12 }} />
          <PrimaryButton title="Back to Discover" onPress={() => router.push('/(tabs)/discover')} />
        </View>
      </SafeAreaView>
    );
  }

  const lineup = (ev.performerIds || [])
    .map((pid: string) => performers.find((p) => p.id === pid))
    .filter(Boolean) as { id: string; stageName: string; photoUrl: string }[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: ev.title,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      />

      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
        {ev.imageUrl ? (
          <Image source={{ uri: ev.imageUrl }} style={{ width: '100%', height: 260 }} />
        ) : null}

        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{ev.title}</Text>

          {/* Date/Time */}
          {ev.datetimeStart ? (
            <Text style={{ color: colors.sub, marginTop: 6 }}>
              {new Date(ev.datetimeStart).toLocaleString()}
              {ev.datetimeEnd ? ` – ${new Date(ev.datetimeEnd).toLocaleTimeString()}` : ''}
            </Text>
          ) : null}

          {/* Venue */}
          {ev.venue?.name ? (
            <Text style={{ color: colors.muted, marginTop: 6 }}>Venue: {ev.venue.name}</Text>
          ) : null}

          {/* Actions */}
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              title={typeof ev.ticketing?.price === 'number' ? `Buy via Venmo — $${ev.ticketing!.price.toFixed(2)}` : 'Buy via Venmo'}
              onPress={() => {
                const handle = ev.ticketing?.payoutVenmo;
                if (handle) {
                  const amount = typeof ev.ticketing?.price === 'number' ? ev.ticketing!.price : undefined;
                  openVenmoPay(handle, amount, `Tickets-${ev.id}`);
                }
              }}
            />
            <View style={{ height: 12 }} />
            <PrimaryButton title="Back to Discover" onPress={() => router.push('/(tabs)/discover')} />
          </View>

          {/* Lineup */}
          {lineup.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Performers</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {lineup.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/performer/${p.id}`)}
                    style={{ alignItems: 'center', width: 86, marginRight: 12, marginBottom: 12 }}
                  >
                    <Image
                      source={{ uri: p.photoUrl }}
                      style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: '#000' }}
                    />
                    <Text numberOfLines={1} style={{ color: colors.sub, fontSize: 12, marginTop: 6 }}>
                      {p.stageName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <AdSlot slot="event" />
      </ScrollView>
    </SafeAreaView>
  );
}