import { Redirect } from 'expo-router';
import { hasRole } from '../lib/userStore';

export default function Index() {
  // Send new users to role selection, returning users straight to the app
  return <Redirect href={hasRole() ? '/(tabs)/discover' : '/onboarding'} />;
}
