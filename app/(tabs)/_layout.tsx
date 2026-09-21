// app/(tabs)/_layout.tsx
import { Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { colors } from '../../src/theme/colors';
import { loadNotifications, getUnreadCount } from '../../lib/notificationsStore';
import { getEffectiveRole, subscribeToRoleChanges } from '../../lib/userStore';

export default function TabLayout() {
  const [unread, setUnread] = useState(0);
  const [role, setRole] = useState(getEffectiveRole());

  // Week 2 role-aware-navigation requirement: react to a role change (or a
  // guest signing in/out of guest mode) immediately, without an app restart.
  // userStore notifies this subscriber on every setRole()/clearRole() call.
  useEffect(() => {
    setRole(getEffectiveRole());
    return subscribeToRoleChanges(() => setRole(getEffectiveRole()));
  }, []);

  useEffect(() => {
    // Load on mount, then poll every 60 s
    async function refresh() {
      await loadNotifications();
      setUnread(getUnreadCount());
    }
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  function BellButton() {
    return (
      <Pressable
        onPress={() => router.push('/notifications')}
        hitSlop={12}
        style={{ marginRight: 14 }}
      >
        <IconSymbol name="bell" size={24} color={colors.textPrimary} />
        {unread > 0 && (
          <View style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.danger ?? '#FF4444',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>
              {unread > 99 ? '99+' : unread}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.navy,
          borderTopColor: colors.border,
          ...(Platform.OS === 'ios' ? { position: 'absolute' } : {}),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.navy },
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerTintColor: colors.teal,
      }}
    >
      {/* Discover tab */}
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          headerTitle: 'Sequins',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="sparkles" color={color} />,
          headerRight: () => <BellButton />,
        }}
      />

      {/* Marketplace tab */}
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Shop',
          headerTitle: 'Marketplace',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="bag" color={color} />,
        }}
      />

      {/* Create / Organize tab — Week 2 role-aware navigation:
          Host sees Create exactly as before; Talent sees My Bookings in the
          same slot (see components/TalentBookingsScreen.tsx, rendered by
          organize.tsx); Fan (and guests, treated as Fan) don't get this tab
          at all — href: null removes it from the bar rather than greying
          it out, per "the plating principle" in the launch checklist. */}
      <Tabs.Screen
        name="organize"
        options={{
          title: role === 'artist' ? 'Bookings' : 'Create',
          href: role === 'fan' ? null : undefined,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name={role === 'artist' ? 'calendar' : 'plus'} color={color} />
          ),
        }}
      />

      {/* Tickets tab */}
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="ticket" color={color} />,
        }}
      />

      {/* Profile tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}