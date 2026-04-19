// app/event/[id]/checkin.tsx
// Door check-in screen for hosts. Enter a ticket ID (from attendee's QR code)
// to validate it and mark the attendee as checked in.

import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchEventById, EventRecord } from '../../../lib/eventsStore';
import { checkInTicket, getEventTicketStats, CheckInResult } from '../../../lib/ticketStore';
import { colors } from '../../../src/theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanEntry = {
  id: string;          // local log key
  ticketId: string;    // raw input
  result: CheckInResult;
  timestamp: string;
};

const REASON_LABELS: Record<string, string> = {
  not_found:          'Ticket not found',
  wrong_event:        'Ticket is for a different event',
  already_checked_in: 'Already checked in',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [input, setInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [log, setLog] = useState<ScanEntry[]>([]);

  const inputRef = useRef<TextInput>(null);

  // Load event metadata
  useEffect(() => {
    if (!eventId) return;
    fetchEventById(eventId).then(e => {
      setEvent(e);
      setLoadingEvent(false);
    });
    refreshStats();
  }, [eventId]);

  async function refreshStats() {
    if (!eventId) return;
    const s = await getEventTicketStats(eventId);
    setStats(s);
  }

  // Parse ticket ID from either raw UUID or QR payload "SEQ-TICKET:uuid"
  function parseTicketId(raw: string): string {
    const trimmed = raw.trim();
    const prefix = 'SEQ-TICKET:';
    return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
  }

  async function handleSubmit() {
    const ticketId = parseTicketId(input);
    if (!ticketId || !eventId) return;

    setScanning(true);
    Keyboard.dismiss();

    const result = await checkInTicket(ticketId, eventId);

    const entry: ScanEntry = {
      id:        `${Date.now()}-${ticketId}`,
      ticketId,
      result,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
    };

    setLog(prev => [entry, ...prev]);
    setInput('');
    setScanning(false);

    if (result.ok) {
      await refreshStats();
    }

    // Re-focus the input so the host can scan the next ticket quickly
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  if (loadingEvent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
        <Stack.Screen options={{ title: 'Door Check-In', headerStyle: { backgroundColor: colors.navy }, headerTitleStyle: { color: colors.textPrimary }, headerTintColor: colors.teal }} />
        <ActivityIndicator color={colors.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: 'Door Check-In',
          headerStyle: { backgroundColor: colors.navy },
          headerTitleStyle: { color: colors.textPrimary },
          headerTintColor: colors.teal,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Event + stats header */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '900' }} numberOfLines={1}>
            {event?.title ?? 'Event'}
          </Text>
          {event?.venue?.name && (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
              📍 {event.venue.name}
            </Text>
          )}

          {/* Check-in counter */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
            marginTop: 14,
          }}>
            {[
              { label: 'Checked In', value: stats.checkedIn, color: colors.teal },
              { label: 'Total Tickets', value: stats.total, color: colors.textSecondary },
              { label: 'Remaining', value: stats.total - stats.checkedIn, color: colors.textMuted },
            ].map(stat => (
              <View key={stat.label} style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <Text style={{ color: stat.color, fontSize: 24, fontWeight: '900' }}>{stat.value}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Input area */}
        <View style={{
          marginHorizontal: 20,
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 16,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            Ticket ID (scan QR or type manually)
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              placeholder="SEQ-TICKET:… or paste UUID"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              style={{
                flex: 1,
                backgroundColor: colors.navy,
                borderRadius: 10,
                padding: 12,
                color: colors.textPrimary,
                fontSize: 14,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={scanning || !input.trim()}
              style={{
                backgroundColor: scanning || !input.trim() ? colors.border : colors.teal,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              {scanning
                ? <ActivityIndicator color={colors.navy} size="small" />
                : <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 15 }}>✓</Text>
              }
            </Pressable>
          </View>
        </View>

        {/* Scan log */}
        {log.length > 0 && (
          <FlatList
            data={log}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            ListHeaderComponent={
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Scan Log
              </Text>
            }
            renderItem={({ item }) => {
              const ok = item.result.ok;
              return (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: ok ? colors.teal + '44' : colors.danger + '44',
                }}>
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{ok ? '✅' : '❌'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: ok ? colors.teal : colors.danger,
                      fontWeight: '700',
                      fontSize: 13,
                    }}>
                      {ok ? 'Checked In' : REASON_LABELS[item.result.reason] ?? 'Error'}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                      {item.ticketId.length > 24 ? `…${item.ticketId.slice(-16)}` : item.ticketId}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.timestamp}</Text>
                </View>
              );
            }}
          />
        )}

        {log.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🎟️</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Ready to scan</Text>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
