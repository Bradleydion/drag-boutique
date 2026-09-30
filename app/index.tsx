import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { isAuthenticated, loadAuth } from '../lib/authStore';
import { registerForPushNotificationsAsync } from '../lib/pushNotificationsStore';
import { loadFollows } from '../lib/followStore';
import { loadListings } from '../lib/marketplaceStore';
import { loadTickets } from '../lib/ticketStore';
import { hasRole, loadRole, restoreRoleFromAccount } from '../lib/userStore';
import { colors } from '../src/theme/colors';

export default function Index() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadRole(), loadAuth()]).then(async () => {
      await Promise.all([loadFollows(), loadTickets(), loadListings()]);
      setReady(true);
      // Register for push now that the saved session is loaded (the cold-start
      // call in _layout can run before auth is ready and silently skip).
      if (isAuthenticated()) registerForPushNotificationsAsync().catch(() => {});
      if (!isAuthenticated()) {
        router.replace('/auth');
      } else if (!hasRole() && !(await restoreRoleFromAccount())) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/discover');
      }
    });
  }, []);

  // Blank navy screen while we check storage — feels instant in practice
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.navy }} />;
  return null;
}
