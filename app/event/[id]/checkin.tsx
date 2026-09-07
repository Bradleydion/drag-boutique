// app/event/[id]/checkin.tsx
// Door check-in screen for hosts and door staff.
// Supports live QR camera scanning (tap the camera icon) or manual text entry.

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
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
  id: string;
  ticketId: string;
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

  const [event, setEvent]             = useState<EventRecord | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [stats, setStats]             = useState({ total: 0, checkedIn: 0 });
  const [input, setInput]             = useState('');
  const [processing, setProcessing]   = useState(false);
  const [log, setLog]                 = useState<ScanEntry[]>([]);

  // Camera state
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false); // debounce rapid scans
  const [permission, requestPermission] = useCameraPermissions();

  const inputRef = useRef<TextInput>(null);

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

  // Parse ticket ID from raw UUID or QR payload "SEQ-TICKET:uuid"
  function parseTicketId(raw: string): string {
    const trimmed = raw.trim();
    const prefix = 'SEQ-TICKET:';
    return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
  }

  async function processTicket(raw: string) {
    const ticketId = parseTicketId(raw);
    if (!ticketId || !eventId) return;

    setProcessing(true);

    const result = await checkInTicket(ticketId, eventId);

    // Haptic feedback — success or error
    if (result.ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    const entry: ScanEntry = {
      id:        `${Date.now()}-${ticketId}`,
      ticketId,
      result,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit',
      }),
    };

    setLog(prev => [entry, ...prev]);
    setInput('');
    setProcessing(false);

    if (result.ok) {
      await refreshStats();
    }
  }

  // Manual text submit
  async function handleSubmit() {
    Keyboard.dismiss();
    await processTicket(input);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // Camera QR scan callback — debounced so one code isn't processed twice
  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scanCooldown || processing) return;
    setScanCooldown(true);
    setCameraOpen(false);
    await processTicket(data);
    // Allow next scan after 1.5 s
    setTimeout(() => setScanCooldown(false), 1500);
  }

  async function openCamera() {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return;
    }
    setCameraOpen(true);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loadingEvent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
        <Stack.Screen options={headerOptions('Door Check-In')} />
        <ActivityIndicator color={colors.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={headerOptions('Door Check-In')} />

      {/* ── Camera Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={cameraOpen}
        animationType="slide"
        onRequestClose={() => setCameraOpen(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />

          {/* Viewfinder overlay */}
          <View style={styles.overlay}>
            <View style={styles.dimTop} />
            <View style={styles.middleRow}>
              <View style={styles.dimSide} />
              <View style={styles.viewfinder}>
                {/* Corner brackets */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <View style={styles.dimSide} />
            </View>
            <View style={styles.dimBottom}>
              <Text style={styles.scanHint}>Point at a ticket QR code</Text>
              <Pressable onPress={() => setCameraOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Main UI ──────────────────────────────────────────────────────── */}
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
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            {[
              { label: 'Checked In',    value: stats.checkedIn,                color: colors.teal },
              { label: 'Total Tickets', value: stats.total,                    color: colors.textSecondary },
              { label: 'Remaining',     value: stats.total - stats.checkedIn,  color: colors.textMuted },
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

        {/* Scan camera button */}
        <Pressable
          onPress={openCamera}
          style={({ pressed }) => ({
            marginHorizontal: 20,
            marginBottom: 14,
            backgroundColor: pressed ? colors.teal + 'CC' : colors.teal,
            borderRadius: 14,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          })}
        >
          <Text style={{ fontSize: 22 }}>📷</Text>
          <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 17 }}>
            Scan QR Code
          </Text>
        </Pressable>

        {/* Manual input */}
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
            Or enter ticket ID manually
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
              disabled={processing || !input.trim()}
              style={{
                backgroundColor: processing || !input.trim() ? colors.border : colors.teal,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              {processing
                ? <ActivityIndicator color={colors.navy} size="small" />
                : <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 15 }}>✓</Text>
              }
            </Pressable>
          </View>
        </View>

        {/* Scan log */}
        {log.length > 0 ? (
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
                    <Text style={{ color: ok ? colors.teal : colors.danger, fontWeight: '700', fontSize: 13 }}>
                      {ok ? 'Checked In' : (REASON_LABELS[item.result.reason] ?? 'Error')}
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
        ) : (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🎟️</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Ready to scan</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Header options factory ────────────────────────────────────────────────────

function headerOptions(title: string) {
  return {
    title,
    headerStyle: { backgroundColor: colors.navy },
    headerTitleStyle: { color: colors.textPrimary },
    headerTintColor: colors.teal,
    headerLeft: () => (
      <Pressable
        onPress={() => router.back()}
        style={{ paddingRight: 16, paddingVertical: 4 }}
        accessibilityLabel="Go back"
      >
        <Text style={{ color: colors.teal, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
      </Pressable>
    ),
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const VIEWFINDER = 260;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  dimTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  middleRow: {
    flexDirection: 'row',
    height: VIEWFINDER,
  },
  dimSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  viewfinder: {
    width: VIEWFINDER,
    height: VIEWFINDER,
  },
  dimBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scanHint: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.85,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Corner bracket decorations
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#00E5CC',
  },
  topLeft: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  topRight: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  bottomLeft: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  bottomRight: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
});
