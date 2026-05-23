// app/event/create/performers.tsx
// Step 2 of event creation: tag which performers are appearing at this event.
// Selections are stored in the draft and written to performer_ids[] on publish.
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getDraft, updateDraft } from '../../../lib/createEventStore';
import { loadPerformers, getPerformers, type PerformerRecord } from '../../../lib/performerStore';
import { colors as C } from '../../../src/theme/colors';

export default function CreateEvent_Performers() {
  const draft = getDraft();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(draft.performerIds ?? []),
  );
  const [performers, setPerformers] = useState<PerformerRecord[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // Use cached performers if available, otherwise fetch
    const cached = getPerformers();
    if (cached.length > 0) {
      setPerformers(cached);
      setLoading(false);
    } else {
      loadPerformers().then(() => {
        setPerformers(getPerformers());
        setLoading(false);
      });
    }
  }, []);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function onNext() {
    updateDraft({ performerIds: Array.from(selected) });
    router.push('/event/create/venue');
  }

  function onSkip() {
    updateDraft({ performerIds: [] });
    router.push('/event/create/venue');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Create Event • Performers',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900' }}>
          Who's performing?
        </Text>
        <Text style={{ color: C.textMuted, marginTop: 4, marginBottom: 20, lineHeight: 20 }}>
          Tag talent on the lineup. Their upcoming shows will appear on their profiles automatically.
        </Text>

        {loading ? (
          <ActivityIndicator color={C.teal} style={{ marginTop: 40 }} />
        ) : performers.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: C.textSecondary, textAlign: 'center' }}>
              No talent profiles found yet.{'\n'}Talent can create their profiles from the Profile tab.
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {performers.map(p => {
              const active = selected.has(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => toggle(p.id)}
                  style={{
                    width: '47%',
                    backgroundColor: active ? C.teal + '18' : C.surface,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: active ? C.teal : C.border,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {/* Avatar */}
                  {p.photoUrl ? (
                    <Image
                      source={{ uri: p.photoUrl }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                  ) : (
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: C.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 20 }}>💃</Text>
                    </View>
                  )}

                  {/* Name */}
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={2}
                      style={{ color: active ? C.teal : C.textPrimary, fontWeight: '700', fontSize: 13, lineHeight: 17 }}
                    >
                      {p.stageName}
                    </Text>
                  </View>

                  {/* Checkmark */}
                  {active && (
                    <View style={{
                      width: 20, height: 20, borderRadius: 10,
                      backgroundColor: C.teal,
                      alignItems: 'center', justifyContent: 'center',
                      position: 'absolute', top: 8, right: 8,
                    }}>
                      <Text style={{ color: C.navy, fontSize: 11, fontWeight: '900' }}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Selected count */}
        {selected.size > 0 && (
          <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13, textAlign: 'center', marginTop: 16 }}>
            {selected.size} performer{selected.size === 1 ? '' : 's'} tagged
          </Text>
        )}

        <View style={{ height: 28 }} />
        <PrimaryButton
          title={selected.size > 0 ? `Next: Venue → (${selected.size} tagged)` : 'Next: Venue →'}
          onPress={onNext}
        />
        <View style={{ height: 12 }} />
        <Pressable onPress={onSkip} accessibilityRole="button">
          <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>
            Skip — no performers to tag
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
