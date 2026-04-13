import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '../src/theme/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerStyle: { backgroundColor: colors.navy }, headerTitleStyle: { color: colors.textPrimary } }} />
      <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 12 }}>
          Page not found
        </Text>
        <Link href="/(tabs)/discover">
          <Text style={{ color: colors.teal, fontSize: 16, textDecorationLine: 'underline' }}>
            Back to Sequins
          </Text>
        </Link>
      </View>
    </>
  );
}
