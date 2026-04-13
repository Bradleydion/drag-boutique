// src/components/DevDebugBanner.tsx
// Only visible in development builds — shows env/debug info at the top of screens.
import { View, Text } from 'react-native';
import { colors } from '../theme/colors';

export default function DevDebugBanner() {
  if (process.env.NODE_ENV !== 'development') return null;
  return (
    <View style={{
      backgroundColor: colors.teal,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginBottom: 4,
    }}>
      <Text style={{ color: colors.offWhite, fontSize: 11, fontWeight: '700' }}>
        DEV BUILD
      </Text>
    </View>
  );
}
