import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

export default function Profile() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: colors.teal,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 32 }}>👑</Text>
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 16 }}>Your Profile</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          Sign in to see your profile, manage your listings, and track your events.
        </Text>
      </View>
    </SafeAreaView>
  );
}