// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { colors } from '../../src/theme/colors';

export default function TabLayout() {
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

      {/* Create / Organize tab */}
      <Tabs.Screen
        name="organize"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="plus" color={color} />,
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