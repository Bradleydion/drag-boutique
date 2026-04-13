import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

export default function Tickets() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 40 }}>🎟️</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 16 }}>Your Tickets</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          Tickets you purchase will appear here. Buy a ticket from the Discover tab to get started.
        </Text>
      </View>
    </SafeAreaView>
  );
}