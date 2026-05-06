// app/event/create/review.tsx
import { Stack, router } from 'expo-router';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { loadPerformers, getPerformers, type PerformerRecord } from '../../../lib/performerStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { getDraft, resetDraft, updateDraft } from '../../../lib/createEventStore';
import { publishDraft } from '../../../lib/eventsStore';
import { saveEventRoles, inviteTalentToRole, roleLabel } from '../../../lib/eventRolesStore';
import { colors as C } from '../../../src/theme/colors';

const GOLD = '#F59E0B';

export default function CreateEvent_Review() {
  const d = getDraft();
  const [publishing, setPublishing] = useState(false);
  const [allPerformers, setAllPerformers] = useState<PerformerRecord[]>([]);
  const [promoted, setPromoted] = useState(d.isPromoted ?? false);

  useEffect(() => {
    const cached = getPerformers();
    if (cached.length > 0) { setAllPerformers(cached); return; }
    loadPerformers().then(() => setAllPerformers(getPerformers()));
  }, []);

  const taggedPerformers = useMemo(
    () => allPerformers.filter(p => d.performerIds?.includes(p.id)),
    [allPerformers, d.performerIds],
  );

  const recurringLabel = useMemo(() => {
    if (!d.isRecurring || !d.recurringFrequency) return undefined;
    const freq = d.recurringFrequency.charAt(0).toUpperCase() + d.recurringFrequency.slice(1);
    return d.recurringEndDate ? `${freq} · ends ${d.recurringEndDate}` : freq;
  }, [d]);

  const rows = useMemo(() => [
    { label: 'Title',           value: d.title },
    { label: 'Description',     value: d.description },
    { label: 'Start',           value: d.datetimeStart },
    { label: 'End',             value: d.datetimeEnd },
    { label: 'Timezone',        value: d.timezone },
    { label: 'Recurring',       value: recurringLabel },
    { label: 'Venue',           value: d.venueName },
    { label: 'Address',         value: [d.venueAddress, d.venueCity, d.venueState, d.venueZip].filter(Boolean).join(', ') },
    { label: 'Venue Instagram', value: d.venueInstagram },
    { label: 'Ticket price',    value: typeof d.ticketPrice === 'number' ? (d.ticketPrice === 0 ? 'Free' : `$${d.ticketPrice.toFixed(2)}`) : undefined },
    { label: 'Payout Venmo',    value: d.payoutVenmo ? `@${d.payoutVenmo.replace(/^@/, '')}` : undefined },
    { label: 'Sales start',     value: d.salesStart },
    { label: 'Sales end',       value: d.salesEnd },
  ], [d, recurringLabel]);

  function togglePromoted(val: boolean) {
    setPromoted(val);
    updateDraft({ isPromoted: val });
  }

  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      const draft = getDraft();
      const event = await publishDraft(draft);
      resetDraft();

      // After publish, save roles + fire invites
      if (draft.eventRoles?.length && event?.id) {
        try {
          const savedRoles = await saveEventRoles(event.id, draft.eventRoles);
          // Fire invites for each pre-selected talent per role
          for (let i = 0; i < draft.eventRoles.length; i++) {
            const draftRole = draft.eventRoles[i];
            const savedRole = savedRoles[i];
            if (!savedRole) continue;
            for (const talentId of draftRole.invitedTalentIds) {
              await inviteTalentToRole({
                eventId:    event.id,
                eventRoleId: savedRole.id,
                talentId,
                payAmount:  draftRole.payAmount,
                eventTitle: draft.title ?? 'your event',
                roleName:   draftRole.roleName,
              }).catch(() => {}); // non-blocking
            }
          }
        } catch (_) {
          // Roles saving failure shouldn't block the success alert
        }
      }

      Alert.alert('🎉 Published!', 'Your event is now live on Sequins.', [
        { text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/organize') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  }, [d]);

  const empty = rows.every((r) => !r.value);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Review & Publish',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900' }}>Review your event</Text>
        <Text style={{ color: C.textMuted, marginTop: 6 }}>Make sure everything looks right before publishing.</Text>

        {empty ? (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: C.textSecondary, marginBottom: 16 }}>
              No draft details yet — start from the beginning.
            </Text>
            <PrimaryButton title="Start with Basics" onPress={() => router.replace('/event/create/basics')} />
          </View>
        ) : (
          <>
            {/* Flyer preview */}
            {d.imageLocalUri && (
              <View style={{ marginTop: 20, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
                <Image source={{ uri: d.imageLocalUri }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
              </View>
            )}

            {/* Tagged performers */}
            {taggedPerformers.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                  Performers ({taggedPerformers.length})
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {taggedPerformers.map(p => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.teal + '55' }}>
                      {p.photoUrl && <Image source={{ uri: p.photoUrl }} style={{ width: 22, height: 22, borderRadius: 11 }} />}
                      <Text style={{ color: C.teal, fontWeight: '700', fontSize: 12 }}>{p.stageName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Summary rows */}
            <View style={{
              backgroundColor: C.surface,
              borderRadius: 14,
              padding: 16,
              marginTop: 20,
              gap: 12,
            }}>
              {rows.filter(r => r.value).map((r) => (
                <View key={r.label}>
                  <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {r.label}
                  </Text>
                  <Text style={{ color: C.textPrimary, marginTop: 2, lineHeight: 20 }}>{r.value}</Text>
                </View>
              ))}
            </View>

            {/* Edit buttons */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 20 }}>
              {[
                { title: 'Basics',      path: '/event/create/basics' },
                { title: 'Performers',  path: '/event/create/performers' },
                { title: 'Venue',       path: '/event/create/venue' },
                { title: 'Tickets',     path: '/event/create/ticketing' },
                { title: 'Roles',       path: '/event/create/roles' },
              ].map(btn => (
                <Pressable
                  key={btn.title}
                  onPress={() => router.push(btn.path as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: C.teal,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: C.teal, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
                    {btn.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 20 }} />

            {/* ── Promote toggle ──────────────────────────────────────────── */}
            <View style={{
              backgroundColor: promoted ? GOLD + '14' : C.surface,
              borderRadius: 14,
              borderWidth: promoted ? 2 : 1,
              borderColor: promoted ? GOLD : C.border,
              padding: 16,
              marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>✦</Text>
                  <Text style={{ color: promoted ? GOLD : C.textPrimary, fontWeight: '900', fontSize: 15 }}>
                    Promote this event
                  </Text>
                </View>
                <Switch
                  value={promoted}
                  onValueChange={togglePromoted}
                  trackColor={{ false: C.border, true: GOLD + 'AA' }}
                  thumbColor={promoted ? GOLD : C.textMuted}
                  ios_backgroundColor={C.border}
                />
              </View>
              <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 19 }}>
                Promoted events get a gold border and a{' '}
                <Text style={{ color: promoted ? GOLD : C.textMuted, fontWeight: '700' }}>✦ Promoted</Text>
                {' '}badge at the top of Discover — putting your event in front of more fans.
              </Text>
              {promoted && (
                <View style={{ marginTop: 10, backgroundColor: GOLD + '22', borderRadius: 8, padding: 10 }}>
                  <Text style={{ color: GOLD, fontWeight: '700', fontSize: 12 }}>
                    ✦ Gold border + badge will appear on your event card.
                  </Text>
                </View>
              )}
            </View>

            {publishing ? (
              <ActivityIndicator color={C.teal} style={{ marginVertical: 16 }} />
            ) : (
              <PrimaryButton title="Publish Event 🎉" onPress={publish} />
            )}

            <View style={{ height: 12 }} />
            <Pressable onPress={() => router.replace('/(tabs)/organize')} accessibilityRole="button">
              <Text style={{ color: C.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>Cancel</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
