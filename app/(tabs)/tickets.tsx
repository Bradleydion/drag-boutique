// app/(tabs)/tickets.tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { events } from '@/data/events';
import { isGuest } from '@/lib/authStore';
import { getTickets, loadTickets, type Ticket } from '@/lib/ticketStore';
import { colors } from '../../src/theme/colors';

// QR code via free public API — no native dependency needed.
// Format matches what the door check-in screen expects: SEQ-TICKET:<uuid>
function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0D1B2A&bgcolor=FFFFFF&qzone=2&data=${encodeURIComponent(data)}`;
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const event = events.find(e => e.id === ticket.event_id);
  const [expanded, setExpanded] = useState(false);

  if (!event) return null;

  const dateStr = new Date(event.dateTimeStart).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeStr = new Date(event.dateTimeStart).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });

  // Short ticket ID shown on the card
  const shortId = ticket.id.slice(0, 8).toUpperCase();
  const qrData = `SEQ-TICKET:${ticket.id}`;

  return (
    <Pressable
      onPress={() => setExpanded(e => !e)}
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
      <Image source={{ uri: event.imageUrl }} style={{ width: '100%', height: 140 }} />

      {/* Ticket tear line */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: -1 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.navy, marginLeft: -7 }} />
        <View style={{
          flex: 1,
          borderTopWidth: 1,
          borderColor: colors.border,
          borderStyle: 'dashed',
        }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.navy, marginRight: -7 }} />
      </View>

      {/* Ticket body */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 17, lineHeight: 22 }}>
              {event.title}
            </Text>
            <Text style={{ color: colors.accent, fontSize: 13, marginTop: 4, fontWeight: '600' }}>
              {dateStr} · {timeStr}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
              📍 {event.venueName} · {event.city}
            </Text>
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

        {/* Ticket ID row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: 'monospace', letterSpacing: 1 }}>
            #{shortId}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {expanded ? 'Hide QR ▲' : 'Show QR ▼'}
          </Text>
        </View>

        {/* QR code — expands on tap */}
        {expanded && (
          <View style={{ alignItems: 'center', marginTop: 16, paddingBottom: 4 }}>
            <View style={{
              padding: 14,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}>
              <Image
                source={{ uri: qrUrl(qrData) }}
                style={{ width: 180, height: 180 }}
              />
            </View>
            <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 12, marginTop: 10, letterSpacing: 0.5 }}>
              Show this at the door · {shortId}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
              Valid for 1 entry
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function TicketsTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const guest = isGuest();

  // Reload whenever the tab comes into focus so purchases from Event Detail show up instantly.
  useFocusEffect(
    useCallback(() => {
      if (guest) { setLoading(false); return; }
      loadTickets().then(() => {
        setTickets(getTickets());
        setLoading(false);
      });
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
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}
