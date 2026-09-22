// components/AccessRestricted.tsx
// Shown by a host/talent/owner-only screen when the signed-in user isn't
// actually the owner of the record it's about to display (a stale link, a
// guessed URL, a shared deep link, or a role change mid-session). This is
// NOT the security boundary by itself -- Supabase RLS is what actually
// blocks the underlying reads/writes -- it just replaces a broken-looking
// admin screen with a clear "you can't be here" message, per the Week 2
// launch-checklist's dead-control-audit item ("hide each one rather than
// disabling it").
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';

export function AccessRestricted({
  title = "This isn't yours to manage",
  body = "You don't have access to this page.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <View style={{ padding: 28, alignItems: 'center', marginTop: 60 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔒</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
          {title}
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
          {body}
        </Text>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/discover'))}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
            marginTop: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>Go Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
