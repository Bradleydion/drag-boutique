// app/blocked.tsx — Profile → Blocked accounts. Lists who you've blocked and lets you unblock.
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getBlockedIds, loadModeration, unblockUser } from '../lib/moderationStore';
import { goBack } from '../lib/nav';
import { colors } from '../src/theme/colors';

type Row = { id: string; name: string };

async function namesFor(ids: string[]): Promise<Row[]> {
  if (ids.length === 0) return [];
  const names = new Map<string, string>();
  const { data: perf } = await supabase.from('performers').select('user_id, stage_name').in('user_id', ids);
  (perf ?? []).forEach((r: { user_id: string; stage_name: string }) => { if (r.stage_name) names.set(r.user_id, r.stage_name); });
  const missing = ids.filter((id) => !names.has(id));
  if (missing.length) {
    const { data: evs } = await supabase.from('events').select('host_id, host_name').in('host_id', missing);
    (evs ?? []).forEach((r: { host_id: string; host_name: string | null }) => {
      if (r.host_name && !names.has(r.host_id)) names.set(r.host_id, r.host_name);
    });
  }
  return ids.map((id) => ({ id, name: names.get(id) ?? 'Sequins member' }));
}

export default function BlockedAccountsScreen() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await loadModeration(true).catch(() => {});
    setRows(await namesFor(getBlockedIds()));
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  function confirmUnblock(row: Row) {
    Alert.alert(`Unblock ${row.name}?`, "Their profiles, shows and Shop listings will show up for you again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          setBusy(row.id);
          try {
            await unblockUser(row.id);
            setRows((r) => (r ?? []).filter((x) => x.id !== row.id));
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not unblock.');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.navy }}>
      <Stack.Screen
        options={{
          title: 'Blocked accounts',
          headerBackTitle: 'Back',
          headerLeft: () => (
            <Pressable onPress={() => goBack('/(tabs)/profile')} hitSlop={12} style={{ paddingRight: 8 }}>
              <Text style={{ color: colors.teal, fontSize: 17 }}>‹ Back</Text>
            </Pressable>
          ),
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.teal,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 18 }}>
          You don't see anything from these accounts: profiles, shows or Shop listings. They aren't told you blocked them.
        </Text>

        {rows === null ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 30 }} />
        ) : rows.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🕊️</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>You haven't blocked anyone.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {rows.map((row) => (
              <View
                key={row.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: colors.surface, borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                  {row.name}
                </Text>
                <Pressable
                  onPress={() => confirmUnblock(row)}
                  disabled={busy === row.id}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.teal }}
                >
                  {busy === row.id
                    ? <ActivityIndicator color={colors.teal} />
                    : <Text style={{ color: colors.teal, fontWeight: '700' }}>Unblock</Text>}
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
