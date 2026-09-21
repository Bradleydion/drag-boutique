// components/TalentBookingsScreen.tsx
// The Talent role's "Bookings" tab — Week 2 role-aware-navigation checklist
// item B. Rendered by app/(tabs)/organize.tsx in place of the Host "Create"
// flow whenever the signed-in user's role is 'artist'. Shows every event
// this performer has been accepted onto, what they were booked as, when
// and where it is, what they'll be paid, and who's hosting.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyPerformerProfile, loadMyPerformerProfile } from '../lib/performerStore';
import { loadMyBookings, roleEmoji, roleLabel, MyBooking } from '../lib/eventRolesStore';
import { colors } from '../src/theme/colors';

function formatDateTime(iso?: string) {
  if (!iso) return 'Date TBD';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function isUpcoming(b: MyBooking) {
  if (!b.datetimeStart) return true;
  return new Date(b.datetimeStart) >= new Date();
}

function BookingCard({ booking }: { booking: MyBooking }) {
  const upcoming = isUpcoming(booking);
  return (
    <Pressable
      onPress={() => router.push(`/event/${booking.eventId}` as any)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <View style={{
          backgroundColor: upcoming ? colors.teal + '22' : colors.border,
          borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{
            color: upcoming ? colors.teal : colors.textMuted,
            fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6,
          }}>
            {upcoming ? 'Upcoming' : 'Past'}
          </Text>
        </View>
        <View style={{
          backgroundColor: colors.peach + '22',
          borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{ color: colors.peach, fontSize: 11, fontWeight: '700' }}>
            {roleEmoji(booking.roleName)} {booking.customRoleName || roleLabel(booking.roleName)}
          </Text>
        </View>
      </View>

      <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16, marginBottom: 4 }}>
        {booking.eventTitle}
      </Text>

      <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 2 }}>
        {formatDateTime(booking.datetimeStart)}
      </Text>

      {(booking.venueName || booking.venueCity) && (
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
          📍 {[booking.venueName, booking.venueCity].filter(Boolean).join(' · ')}
        </Text>
      )}

      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {booking.hostName ? `Hosted by ${booking.hostName}` : 'Host TBD'}
        </Text>
        {typeof booking.payAgreed === 'number' && (
          <Text style={{
            color: booking.paymentStatus === 'paid' ? colors.success : colors.textPrimary,
            fontWeight: '800', fontSize: 14,
          }}>
            {booking.paymentStatus === 'paid' ? '✓ Paid ' : ''}${booking.payAgreed}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function EmptyState({
  emoji, title, body, ctaLabel, onPress, filled,
}: {
  emoji: string; title: string; body: string; ctaLabel: string; onPress: () => void; filled?: boolean;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <View style={{ padding: 28, alignItems: 'center', marginTop: 40 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>{emoji}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
          {title}
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
          {body}
        </Text>
        <Pressable
          onPress={onPress}
          style={{
            backgroundColor: filled ? colors.coral : colors.surface,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
            marginTop: 20,
            borderWidth: filled ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{
            color: filled ? '#fff' : colors.textPrimary,
            fontWeight: filled ? '800' : '700',
            fontSize: filled ? 15 : 14,
          }}>
            {ctaLabel}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function TalentBookingsScreen() {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(!!getMyPerformerProfile());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      (async () => {
        const profile = await loadMyPerformerProfile();
        if (cancelled) return;
        setHasProfile(!!profile);
        if (profile) {
          const rows = await loadMyBookings(profile.id).catch(() => []);
          if (!cancelled) setBookings(rows);
        } else {
          setBookings([]);
        }
        if (!cancelled) setLoading(false);
      })();
      return () => { cancelled = true; };
    }, []),
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.teal} />
      </SafeAreaView>
    );
  }

  if (!hasProfile) {
    return (
      <EmptyState
        emoji="🎭"
        title="Finish your talent profile"
        body="Hosts can only book you once you've set up a public profile."
        ctaLabel="Create Talent Profile →"
        onPress={() => router.push('/performer/create' as any)}
        filled
      />
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        emoji="📭"
        title="No bookings yet"
        body="Once a host accepts you for a show, it'll show up here. Make sure your profile is filled out so hosts can find and book you."
        ctaLabel="Review My Profile"
        onPress={() => router.push('/performer/create' as any)}
      />
    );
  }

  const upcoming = bookings
    .filter(isUpcoming)
    .sort((a, b) => (a.datetimeStart ?? '').localeCompare(b.datetimeStart ?? ''));
  const past = bookings
    .filter(b => !isUpcoming(b))
    .sort((a, b) => (b.datetimeStart ?? '').localeCompare(a.datetimeStart ?? ''));

  const sections = [
    ...(upcoming.length ? [{ title: 'Upcoming', data: upcoming }] : []),
    ...(past.length ? [{ title: 'Past', data: past }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }} edges={['left', 'right', 'bottom']}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 16 }}>
            My Bookings
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={{
            color: colors.textMuted, fontSize: 12, fontWeight: '700',
            letterSpacing: 1, marginBottom: 10, marginTop: 4,
          }}>
            {section.title.toUpperCase()}
          </Text>
        )}
        renderItem={({ item }) => <BookingCard booking={item} />}
      />
    </SafeAreaView>
  );
}
