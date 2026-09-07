// app/event/[id]/analytics.tsx
// Host-only event analytics: ticket sales, revenue, check-in rate, staff cost, net.

import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadEventAnalytics, type EventAnalytics } from '../../../lib/analyticsStore';
import { fetchEventById, type EventRecord } from '../../../lib/eventsStore';
import { colors as C } from '../../../src/theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return 'Date TBD';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function dollars(n: number) {
  return `$${n.toFixed(2)}`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, wide,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  wide?: boolean;
}) {
  return (
    <View style={{
      flex: wide ? 2 : 1,
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      minWidth: wide ? '100%' : undefined,
    }}>
      <Text style={{ color: color ?? C.textPrimary, fontSize: 26, fontWeight: '900' }}>
        {value}
      </Text>
      <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 3, textAlign: 'center' }}>
        {label}
      </Text>
      {sub && (
        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 3, textAlign: 'center' }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

// ─── Bar for check-in progress ────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={{
      height: 8, borderRadius: 4,
      backgroundColor: C.border,
      marginTop: 8,
      overflow: 'hidden',
    }}>
      <View style={{
        width: `${Math.min(100, Math.round(value * 100))}%`,
        height: '100%',
        borderRadius: 4,
        backgroundColor: color,
      }} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();

  const [event,      setEvent]      = useState<EventRecord | null>(null);
  const [analytics,  setAnalytics]  = useState<EventAnalytics | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAll(spinner = false) {
    if (!eventId) return;
    if (spinner) setLoading(true);
    try {
      const [ev, an] = await Promise.all([
        fetchEventById(eventId),
        loadEventAnalytics(eventId),
      ]);
      setEvent(ev);
      setAnalytics(an);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(true); }, [eventId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [eventId]);

  const headerLeft = () => (
    <Pressable onPress={() => router.back()} style={{ paddingRight: 16, paddingVertical: 4 }}>
      <Text style={{ color: C.teal, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <Stack.Screen options={{
          title: 'Analytics',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerLeft,
        }} />
        <ActivityIndicator color={C.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const a = analytics!;
  const netPositive = a.netEstimate >= 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Analytics',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerBackTitle: 'Back',
          headerLeft,
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
      >
        {/* Event header */}
        <Text style={{ color: C.textPrimary, fontSize: 20, fontWeight: '900' }} numberOfLines={2}>
          {event?.title ?? 'Event'}
        </Text>
        {event?.datetimeStart && (
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 3 }}>
            📅 {formatDate(event.datetimeStart)}
          </Text>
        )}
        {event?.venue?.name && (
          <Text style={{ color: C.textMuted, fontSize: 13 }}>
            📍 {event.venue.name}
          </Text>
        )}

        {/* ── Ticket stats ─────────────────────────────────────── */}
        <Text style={sectionLabel}>Tickets</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard
            label="Sold"
            value={a.ticketsSold}
            color={C.teal}
            sub={event?.capacity ? `of ${event.capacity} capacity` : undefined}
          />
          <StatCard
            label="Revenue"
            value={dollars(a.grossRevenue)}
            color="#34D399"
          />
          <StatCard
            label="Checked In"
            value={a.checkedIn}
            color={C.coral}
            sub={a.ticketsSold > 0 ? pct(a.checkInRate) : undefined}
          />
        </View>

        {/* Check-in progress bar */}
        {a.ticketsSold > 0 && (
          <View style={{
            backgroundColor: C.surface, borderRadius: 14, padding: 14,
            marginTop: 10, borderWidth: 1, borderColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 13 }}>
                Door Progress
              </Text>
              <Text style={{ color: C.coral, fontWeight: '800', fontSize: 13 }}>
                {a.checkedIn} / {a.ticketsSold} checked in
              </Text>
            </View>
            <ProgressBar value={a.checkInRate} color={C.coral} />
          </View>
        )}

        {/* ── Staff stats ──────────────────────────────────────── */}
        <Text style={sectionLabel}>Staff</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard
            label="Confirmed"
            value={a.staffConfirmed}
            color="#34D399"
          />
          <StatCard
            label="Pending"
            value={a.staffPending}
            color={C.teal}
          />
          <StatCard
            label="Staff Cost"
            value={dollars(a.staffCost)}
            color="#F87171"
          />
        </View>

        {/* ── Net estimate ─────────────────────────────────────── */}
        <Text style={sectionLabel}>Bottom Line</Text>
        <View style={{
          backgroundColor: netPositive ? '#34D399' + '12' : '#F87171' + '12',
          borderRadius: 16, padding: 18,
          borderWidth: 1.5, borderColor: netPositive ? '#34D399' + '55' : '#F87171' + '55',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                Est. Net
              </Text>
              <Text style={{
                color: netPositive ? '#34D399' : '#F87171',
                fontSize: 36, fontWeight: '900', marginTop: 2,
              }}>
                {netPositive ? '' : '–'}{dollars(Math.abs(a.netEstimate))}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View>
                <Text style={{ color: C.textMuted, fontSize: 11, textAlign: 'right' }}>Gross Revenue</Text>
                <Text style={{ color: '#34D399', fontWeight: '700', textAlign: 'right' }}>{dollars(a.grossRevenue)}</Text>
              </View>
              <View>
                <Text style={{ color: C.textMuted, fontSize: 11, textAlign: 'right' }}>Staff Cost</Text>
                <Text style={{ color: '#F87171', fontWeight: '700', textAlign: 'right' }}>– {dollars(a.staffCost)}</Text>
              </View>
            </View>
          </View>
          <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 10, lineHeight: 17 }}>
            Estimate based on ticket revenue minus confirmed staff pay. Does not include venue costs or other expenses.
          </Text>
        </View>

        {/* ── Sales timeline ───────────────────────────────────── */}
        {a.recentSales.length > 0 && (
          <>
            <Text style={sectionLabel}>Sales by Day</Text>
            <View style={{
              backgroundColor: C.surface, borderRadius: 14,
              borderWidth: 1, borderColor: C.border, overflow: 'hidden',
            }}>
              {a.recentSales.map((day, i) => (
                <View key={day.date} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 14, paddingVertical: 11,
                  borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border,
                }}>
                  <Text style={{ color: C.textSecondary, fontSize: 13, flex: 1 }}>{day.date}</Text>
                  <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13, marginRight: 16 }}>
                    {day.count} ticket{day.count !== 1 ? 's' : ''}
                  </Text>
                  <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 13 }}>
                    {dollars(day.revenue)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Empty ticket state ───────────────────────────────── */}
        {a.ticketsSold === 0 && (
          <View style={{
            backgroundColor: C.surface, borderRadius: 14, padding: 24,
            alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 12,
          }}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>🎟️</Text>
            <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 16 }}>No tickets sold yet</Text>
            <Text style={{ color: C.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              Once fans start purchasing, their sales will appear here in real time.
            </Text>
          </View>
        )}

        {/* ── Invoice CTA ──────────────────────────────────────── */}
        <Pressable
          onPress={() => router.push(`/event/${eventId}/invoice` as any)}
          style={{
            backgroundColor: C.teal + '18',
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 24,
            borderWidth: 1.5,
            borderColor: C.teal + '55',
          }}
        >
          <Text style={{ color: C.teal, fontWeight: '900', fontSize: 15 }}>📄 Generate Invoice</Text>
          <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>Export a PDF summary to share or print</Text>
        </Pressable>

        {/* ── Quick links ─────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Pressable
            onPress={() => router.push(`/event/${eventId}/roster` as any)}
            style={{
              flex: 1, backgroundColor: '#6366F1' + '22', borderRadius: 12,
              paddingVertical: 12, alignItems: 'center',
              borderWidth: 1, borderColor: '#6366F1' + '55',
            }}
          >
            <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: 13 }}>👥 Staff Roster</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/event/${eventId}/checkin` as any)}
            style={{
              flex: 1, backgroundColor: C.coral + '22', borderRadius: 12,
              paddingVertical: 12, alignItems: 'center',
              borderWidth: 1, borderColor: C.coral + '55',
            }}
          >
            <Text style={{ color: C.coral, fontWeight: '700', fontSize: 13 }}>🚪 Door Check-In</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const sectionLabel = {
  color: '#9CA3AF',
  fontSize: 11,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  marginTop: 20,
  marginBottom: 10,
};
