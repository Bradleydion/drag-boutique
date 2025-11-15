// app/(tabs)/_layout.tsx
import { Tabs, router } from 'expo-router';
import { Platform, Button } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#333',
        tabBarStyle: Platform.select({ ios: { position: 'absolute' }, default: {} }),
        headerStyle: { backgroundColor: '#FFEB99' },
        headerTitleStyle: { color: '#000' },
        headerTintColor: '#000',
      }}
    >
      {/* Discover tab */}
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          headerTitle: 'Drag Boutique',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />,
        }}
      />

      {/* Create / Organize tab */}
      <Tabs.Screen
        name="organize"
        options={{
          title: 'Create',
          headerLeft: () => <Button title="Back" onPress={() => router.back()} />,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus" color={color} />,
        }}
      />

      {/* Tickets tab (placeholder) */}
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="ticket" color={color} />,
        }}
      />

      {/* Profile tab (placeholder) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}