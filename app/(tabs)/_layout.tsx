import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function TabsLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Tabs initialRouteName="discover" screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
        <Tabs.Screen name="tickets"  options={{ title: 'Tickets'  }} />
        <Tabs.Screen name="profile"  options={{ title: 'Profile'  }} />
      </Tabs>
    </>
  );
}