// app/(tabs)/organize.tsx
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '../../src/theme/colors';

export default function OrganizeTab() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <View style={{ padding: 24 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '900' }}>Create an Event</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 22 }}>
          Set up your event details, venue, and ticketing in a few quick steps.
        </Text>

        <View style={{ height: 32 }} />

        {/* Feature highlights */}
        {[
          { emoji: '📋', label: 'Event basics — title, description, date & time' },
          { emoji: '📍', label: 'Venue — address and directions' },
          { emoji: '🎟️', label: 'Ticketing — price and Venmo payout' },
          { emoji: '✅', label: 'Review and publish' },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
            <Text style={{ fontSize: 18, marginRight: 10 }}>{item.emoji}</Text>
            <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 22 }}>{item.label}</Text>
          </View>
        ))}

        <View style={{ height: 24 }} />
        <PrimaryButton title="Start Event Setup" onPress={() => router.push('/event/create/basics')} />

        <View style={{ height: 12 }} />
        <Pressable onPress={() => router.push('/(tabs)/discover')}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', textDecorationLine: 'underline' }}>
            Back to Discover
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}