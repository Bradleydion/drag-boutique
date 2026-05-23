// app/event/[id]/invoice.tsx
// Invoice preview + share/print for a host event.
// Accessible from the Analytics screen via "Generate Invoice".

import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadEventAnalytics, type EventAnalytics } from '../../../lib/analyticsStore';
import { fetchEventById, type EventRecord } from '../../../lib/eventsStore';
import { loadEventTalent, type EventTalentInvite } from '../../../lib/eventRolesStore';
import { generateAndShareInvoice, printInvoice } from '../../../lib/invoiceStore';
import { colors as C } from '../../../src/theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dollars(n: number) {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso?: string) {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ─── Preview card ─────────────────────────────────────────────────────────────

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    }}>
      <Text style={{ color: C.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: color ?? C.textPrimary, fontWeight: '700', fontSize: 14 }}>{value}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function InvoiceScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();

  const [event,     setEvent]     = useState<EventRecord | null>(null);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [talent,    setTalent]    = useState<EventTalentInvite[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [sharing,   setSharing]   = useState(false);
  const [printing,  setPrinting]  = useState(false);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [ev, an, tal] = await Promise.all([
        fetchEventById(eventId),
        loadEventAnalytics(eventId),
        loadEventTalent(eventId),
      ]);
      setEvent(ev);
      setAnalytics(an);
      setTalent(tal.filter(t => t.status === 'accepted'));
      setLoading(false);
    })();
  }, [eventId]);

  const headerLeft = () => (
    <Pressable onPress={() => router.back()} style={{ paddingRight: 16, paddingVertical: 4 }}>
      <Text style={{ color: C.teal, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
    </Pressable>
  );

  async function handleShare() {
    if (!event || !analytics) return;
    setSharing(true);
    try {
      await generateAndShareInvoice(event, analytics, talent);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not generate invoice. Make sure expo-print is installed.');
    } finally {
      setSharing(false);
    }
  }

  async function handlePrint() {
    if (!event || !analytics) return;
    setPrinting(true);
    try {
      await printInvoice(event, analytics, talent);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not open print dialog.');
    } finally {
      setPrinting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <Stack.Screen options={{
          title: 'Invoice',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerLeft,
        }} />
        <ActivityIndicator color={C.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!event || !analytics) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <Stack.Screen options={{ title: 'Invoice', headerStyle: { backgroundColor: C.navy }, headerTitleStyle: { color: C.textPrimary }, headerTintColor: C.teal, headerLeft }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.textMuted }}>Could not load event data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const a = analytics;
  const netPositive = a.netEstimate >= 0;
  const confirmedStaff = talent.filter(t => t.payAgreed);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Invoice',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerBackTitle: 'Back',
          headerLeft,
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Preview card */}
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: C.border,
          marginBottom: 20,
        }}>
          {/* Invoice header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View>
              <Text style={{ color: C.teal, fontWeight: '900', fontSize: 20, letterSpacing: -0.5 }}>✦ Sequins</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Event Summary Invoice</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {`SEQ-${eventId?.slice(0, 8).toUpperCase()}`}
              </Text>
              <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Event info */}
          <View style={{
            backgroundColor: C.navy,
            borderRadius: 10,
            padding: 14,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 16, marginBottom: 6 }}>
              {event.title}
            </Text>
            {event.datetimeStart && (
              <Text style={{ color: C.textSecondary, fontSize: 12 }}>
                📅 {formatDate(event.datetimeStart)}
              </Text>
            )}
            {event.venue?.name && (
              <Text style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }}>
                📍 {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ''}
              </Text>
            )}
          </View>

          {/* Revenue */}
          <Text style={sectionLabel}>Ticket Revenue</Text>
          <SummaryRow
            label={`${a.ticketsSold} ticket${a.ticketsSold !== 1 ? 's' : ''} sold`}
            value={dollars(a.grossRevenue)}
            color="#34D399"
          />
          <SummaryRow
            label={`${a.checkedIn} checked in (${Math.round(a.checkInRate * 100)}%)`}
            value=""
          />

          {/* Staff costs */}
          {confirmedStaff.length > 0 && (
            <>
              <Text style={[sectionLabel, { marginTop: 18 }]}>Staff Pay</Text>
              {confirmedStaff.map(t => (
                <SummaryRow
                  key={t.id}
                  label={t.stageName ?? 'Staff Member'}
                  value={`–${dollars(t.payAgreed!)}`}
                  color="#F87171"
                />
              ))}
            </>
          )}

          {/* Bottom line */}
          <View style={{
            marginTop: 20,
            paddingTop: 16,
            borderTopWidth: 2,
            borderTopColor: C.border,
          }}>
            <SummaryRow label="Gross Revenue" value={dollars(a.grossRevenue)} color="#34D399" />
            <SummaryRow label="Staff Cost" value={`–${dollars(a.staffCost)}`} color="#F87171" />
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
              padding: 14,
              backgroundColor: netPositive ? '#34D399' + '18' : '#F87171' + '18',
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: netPositive ? '#34D399' + '55' : '#F87171' + '55',
            }}>
              <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
                {netPositive ? 'Net Profit' : 'Net Loss'}
              </Text>
              <Text style={{
                color: netPositive ? '#34D399' : '#F87171',
                fontWeight: '900', fontSize: 22,
              }}>
                {dollars(a.netEstimate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={{ color: C.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 17, marginBottom: 24 }}>
          Estimate based on ticket revenue minus confirmed staff pay.{'\n'}
          Does not include venue or other expenses.
        </Text>

        {/* Action buttons */}
        <Pressable
          onPress={handleShare}
          disabled={sharing}
          style={{
            backgroundColor: C.teal,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            marginBottom: 12,
            opacity: sharing ? 0.7 : 1,
          }}
        >
          {sharing ? (
            <ActivityIndicator color={C.navy} />
          ) : (
            <Text style={{ color: C.navy, fontWeight: '900', fontSize: 16 }}>
              📤 Save / Share PDF
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={handlePrint}
          disabled={printing}
          style={{
            backgroundColor: C.surface,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: C.border,
            opacity: printing ? 0.7 : 1,
          }}
        >
          {printing ? (
            <ActivityIndicator color={C.teal} />
          ) : (
            <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
              🖨️ Print
            </Text>
          )}
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const sectionLabel = {
  color: '#9CA3AF',
  fontSize: 10,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  marginBottom: 4,
};
