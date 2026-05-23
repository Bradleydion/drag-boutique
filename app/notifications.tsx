// app/notifications.tsx
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  loadNotifications,
  getNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
  type NotificationRecord,
  type NotificationType,
} from '../lib/notificationsStore';
import { colors as C } from '../src/theme/colors';

// ─── Icon + colour per notification type ─────────────────────────────────────

const TYPE_META: Record<NotificationType, { emoji: string; accent: string }> = {
  ticket_sold:       { emoji: '🎟', accent: C.teal },
  booking_request:   { emoji: '📩', accent: '#A78BFA' },   // violet
  booking_accepted:  { emoji: '✅', accent: '#34D399' },   // green
  booking_declined:  { emoji: '❌', accent: '#F87171' },   // red
  performer_tagged:  { emoji: '💃', accent: C.teal },
  event_updated:     { emoji: '📅', accent: '#FBBF24' },   // amber
};

// ─── Single notification row ──────────────────────────────────────────────────

function NotifRow({ n, onPress }: { n: NotificationRecord; onPress: () => void }) {
  const meta = TYPE_META[n.type] ?? { emoji: '🔔', accent: C.teal };
  const isUnread = !n.readAt;

  const date = new Date(n.createdAt);
  const timeLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' · '
    + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        backgroundColor: isUnread ? C.surface : 'transparent',
        borderRadius: 12,
        borderWidth: isUnread ? 1 : 0,
        borderColor: meta.accent + '33',
        marginBottom: 8,
      }}
    >
      {/* Emoji icon */}
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: meta.accent + '22',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{
            color: isUnread ? C.textPrimary : C.textSecondary,
            fontWeight: isUnread ? '800' : '600',
            fontSize: 14,
            flex: 1,
          }}>
            {n.title}
          </Text>
          {isUnread && (
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: meta.accent,
              flexShrink: 0,
            }} />
          )}
        </View>

        {n.body ? (
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
            {n.body}
          </Text>
        ) : null}

        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>
          {timeLabel}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    await loadNotifications();
    setNotifications(getNotifications());
    if (showSpinner) setLoading(false);
  }

  useEffect(() => { load(true); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  async function handlePress(n: NotificationRecord) {
    if (!n.readAt) {
      await markRead(n.id);
      setNotifications(prev =>
        prev.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x),
      );
    }
    if (n.link) {
      router.push(n.link as any);
    }
  }

  async function handleMarkAllRead() {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  const unread = notifications.filter(n => !n.readAt);
  const read   = notifications.filter(n =>  n.readAt);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary, fontWeight: '800' },
          headerTintColor: C.teal,
          headerRight: unread.length > 0
            ? () => (
                <Pressable onPress={handleMarkAllRead} hitSlop={12} style={{ marginRight: 16 }}>
                  <Text style={{ color: C.teal, fontWeight: '700', fontSize: 14 }}>Mark all read</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      {loading ? (
        <ActivityIndicator color={C.teal} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />
          }
        >
          {notifications.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '800' }}>
                All caught up!
              </Text>
              <Text style={{ color: C.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                Notifications about ticket sales, booking{'\n'}requests, and event updates will appear here.
              </Text>
            </View>
          ) : (
            <>
              {/* Unread section */}
              {unread.length > 0 && (
                <>
                  <Text style={{
                    color: C.textMuted, fontSize: 11, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
                  }}>
                    New · {unread.length}
                  </Text>
                  {unread.map(n => (
                    <NotifRow key={n.id} n={n} onPress={() => handlePress(n)} />
                  ))}
                  {read.length > 0 && <View style={{ height: 16 }} />}
                </>
              )}

              {/* Read section */}
              {read.length > 0 && (
                <>
                  <Text style={{
                    color: C.textMuted, fontSize: 11, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
                  }}>
                    Earlier
                  </Text>
                  {read.map(n => (
                    <NotifRow key={n.id} n={n} onPress={() => handlePress(n)} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
