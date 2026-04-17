import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { isAuthenticated, loadAuth } from '../lib/authStore';
import { loadFollows } from '../lib/followStore';
import { loadListings } from '../lib/marketplaceStore';
import { loadTickets } from '../lib/ticketStore';
import { hasRole, loadRole } from '../lib/userStore';
import { colors } from '../src/theme/colors';

export default function Index() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadRole(), loadAuth()]).then(async () => {
      await Promise.all([loadFollows(), loadTickets(), loadListings()]);
      setReady(true);
      if (!isAuthenticated()) {
        router.replace('/auth');
      } else if (!hasRole()) {
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
