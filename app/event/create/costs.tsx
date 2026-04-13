// app/event/create/costs.tsx
// Placeholder — costs/fees breakdown screen (future feature)
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../src/theme/colors';

export default function CreateEvent_Costs() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Cost Breakdown</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
          Coming soon — detailed cost and fee breakdown for your event.
        </Text>
      </View>
    </SafeAreaView>
  );
}
