// app/(tabs)/tickets.tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { isGuest } from '@/lib/authStore';
import { getTickets, loadTickets, type Ticket } from '@/lib/ticketStore';
import { fetchEventById, type EventRecord } from '@/lib/eventsStore';
import { colors } from '../../src/theme/colors';

function TicketCard({ ticket, event }: { ticket: Ticket; event: EventRecord | null }) {
  const [modalVisible, setModalVisible] = useState(false);

  const title     = event?.title      ?? 'Loading…';
  const dateStart = event?.datetimeStart;
  const venueName = event?.venue?.name;
  const venueCity = event?.venue?.city;
  const imageUrl  = event?.imageUrl;

  const dateStr = dateStart
    ? new Date(dateStart).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : '';
  const timeStr = dateStart
    ? new Date(dateStart).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '';

  const shortId = ticket.id.slice(0, 8).toUpperCase();
  const qrData  = `SEQ-TICKET:${ticket.id}`;

  return (
    <>
      {/* ── Full-screen QR modal (Apple Wallet style) ───────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          {/* Event name */}
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#0D1B2A', textAlign: 'center', marginBottom: 6 }}>
            {title}
          </Text>
          {dateStr ? (
            <Text style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>{dateStr} · {timeStr}</Text>
          ) : null}
          {(venueName || venueCity) ? (
            <Text style={{ fontSize: 13, color: '#777', marginBottom: 28 }}>
              📍 {[venueName, venueCity].filter(Boolean).join(' · ')}
            </Text>
          ) : <View style={{ height: 28 }} />}

          {/* QR code — rendered entirely offline */}
          <View style={{
            padding: 20,
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}>
            <QRCode
              value={qrData}
              size={240}
              color="#0D1B2A"
              backgroundColor="#FFFFFF"
              quietZone={10}
            />
          </View>

          {/* Ticket ID */}
          <Text style={{ marginTop: 24, fontSize: 13, fontFamily: 'monospace', color: '#0D1B2A', letterSpacing: 2, fontWeight: '700' }}>
            #{shortId}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: '#999' }}>Valid for 1 entry</Text>

          {/* Close button */}
          <Pressable
            onPress={() => setModalVisible(false)}
            style={{
              marginTop: 36,
              backgroundColor: '#0D1B2A',
              borderRadius: 14,
              paddingHorizontal: 40,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: '#00E5CC', fontWeight: '800', fontSize: 16 }}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Ticket card ─────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 16,
        }}
      >
        {/* Event banner */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 140 }} />
        ) : (
          <View style={{ width: '100%', height: 140, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 40 }}>🎟️</Text>
          </View>
        )}

        {/* Ticket tear line */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: -1 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.navy, marginLeft: -7 }} />
          <View style={{ flex: 1, borderTopWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }} />
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.navy, marginRight: -7 }} />
        </View>

        {/* Ticket body */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 17, lineHeight: 22 }}>
                {title}
              </Text>
              {dateStr ? (
                <Text style={{ color: colors.accent, fontSize: 13, marginTop: 4, fontWeight: '600' }}>
                  {dateStr} · {timeStr}
                </Text>
              ) : null}
              {(venueName || venueCity) ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  📍 {[venueName, venueCity].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <View style={{
              backgroundColor: colors.teal + '22',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: colors.teal,
              alignSelf: 'flex-start',
            }}>
              <Text style={{ color: colors.teal, fontSize: 12, fontWeight: '700' }}>
                {ticket.price === 0 ? 'FREE' : `$${Number(ticket.price).toFixed(2)}`}
              </Text>
            </View>
          </View>

          {/* Tap prompt */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'monospace', letterSpacing: 1 }}>
              #{shortId}
            </Text>
            <Text style={{ color: colors.teal, fontSize: 12, fontWeight: '600' }}>
              Tap to show QR →
            </Text>
          </View>
        </View>
      </Pressable>
    </>
  );
}

export default function TicketsTab() {
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [eventMap, setEventMap] = useState<Record<string, EventRecord>>({});
  const [loading,  setLoading]  = useState(true);
  const guest = isGuest();

  // Reload whenever the tab comes into focus so purchases from Event Detail show up instantly.
  useFocusEffect(
    useCallback(() => {
      if (guest) { setLoading(false); return; }
      (async () => {
        await loadTickets();
        const loaded = getTickets();
        setTickets(loaded);
        // Fetch event details for each unique event_id in parallel
        const uniqueEventIds = [...new Set(loaded.map(t => t.event_id))];
        const results = await Promise.all(uniqueEventIds.map(id => fetchEventById(id)));
        const map: Record<string, EventRecord> = {};
        results.forEach((ev, i) => { if (ev) map[uniqueEventIds[i]] = ev; });
        setEventMap(map);
        setLoading(false);
      })();
    }, [guest]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

        {/* Header */}
        <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 4 }}>
          My Tickets
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24 }}>
          {tickets.length > 0
            ? `${tickets.length} ticket${tickets.length === 1 ? '' : 's'} · tap to show QR`
            : 'Your purchased tickets will appear here'}
        </Text>

        {/* Guest state */}
        {guest && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎟️</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
              Sign in to see your tickets
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Create a free account to buy tickets and keep them in one place.
            </Text>
            <Pressable
              onPress={() => router.push('/auth')}
              style={{
                marginTop: 20,
                backgroundColor: colors.teal,
                borderRadius: 12,
                paddingHorizontal: 28,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 15 }}>Create Account</Text>
            </Pressable>
          </View>
        )}

        {/* Loading state */}
        {!guest && loading && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>Loading tickets…</Text>
          </View>
        )}

        {/* Empty state */}
        {!guest && !loading && tickets.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎟️</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
              No tickets yet
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Browse upcoming events and grab a ticket to get the party started.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/discover')}
              style={{
                marginTop: 20,
                backgroundColor: colors.teal,
                borderRadius: 12,
                paddingHorizontal: 28,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 15 }}>Browse Events</Text>
            </Pressable>
          </View>
        )}

        {/* Ticket list */}
        {!guest && !loading && tickets.map(ticket => (
          <TicketCard key={ticket.id} ticket={ticket} event={eventMap[ticket.event_id] ?? null} />
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}
