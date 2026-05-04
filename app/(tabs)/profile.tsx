// app/(tabs)/profile.tsx
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAccount, getEmail, getSession, isGuest, signOut, updateDisplayName } from '../../lib/authStore';
import { events, performers } from '../../data/events';
import { getFollowedIds } from '../../lib/followStore';
import { getTickets, loadTickets, type Ticket } from '../../lib/ticketStore';
import { deleteListing, getMyListings, loadListings, markSold, type Listing } from '../../lib/marketplaceStore';
import { loadMyPerformerProfile, type PerformerRecord } from '../../lib/performerStore';
import { clearRole, getRole } from '../../lib/userStore';
import { colors } from '../../src/theme/colors';

// Role-specific sections shown beneath the main profile card
const ROLE_SECTIONS: Record<string, { emoji: string; label: string; sublabel: string }[]> = {
  artist: [
    { emoji: '🎭', label: 'Performer Profile', sublabel: 'Edit your public page, bio & photos' },
    { emoji: '📅', label: 'Bookings', sublabel: 'View upcoming and past gigs' },
    { emoji: '💰', label: 'Earnings', sublabel: 'Tips, bookings, and commissions' },
  ],
  host: [
    { emoji: '🎪', label: 'My Events', sublabel: 'Manage events you\'ve created' },
    { emoji: '👥', label: 'Staff Roster', sublabel: 'Manage DJs, door crew, tip takers' },
    { emoji: '🧾', label: 'Invoices', sublabel: 'View and send event invoices' },
    { emoji: '💸', label: 'Payouts', sublabel: 'Pay staff via Venmo or Stripe' },
  ],
  fan: [
    { emoji: '🎟️', label: 'My Tickets', sublabel: 'Your purchased event tickets' },
    { emoji: '⭐', label: 'Following', sublabel: 'Artists and venues you follow' },
    { emoji: '💝', label: 'Tips Sent', sublabel: 'Your tipping history' },
  ],
};

const ROLE_COLORS: Record<string, string> = {
  artist: colors.coral,
  host:   colors.peach,
  fan:    colors.teal,
};

const ROLE_LABELS: Record<string, string> = {
  artist: '💃 Artist',
  host:   '🎪 Host',
  fan:    '🎟️ Fan',
};

function getInitials(name?: string, email?: string): string {
  if (name?.trim()) return name.trim().slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
}

export default function ProfileTab() {
  const email = getEmail();
  const guest = isGuest();
  const displayNameFromMeta = getSession()?.user?.user_metadata?.display_name as string | undefined;
  const role = getRole() ?? 'fan';

  const [editingName,     setEditingName]     = useState(false);
  const [nameInput,       setNameInput]       = useState(displayNameFromMeta ?? '');
  const [myTickets,       setMyTickets]       = useState<Ticket[]>([]);
  const [myListings,      setMyListings]      = useState<Listing[]>([]);
  const [myArtistProfile, setMyArtistProfile] = useState<PerformerRecord | null>(null);

  // Reload tickets, listings, and performer profile whenever the tab comes into focus.
  useFocusEffect(
    useCallback(() => {
      if (!guest) {
        loadTickets().then(() => setMyTickets(getTickets()));
        loadListings().then(() => setMyListings(getMyListings()));
        if (role === 'artist') {
          loadMyPerformerProfile().then(setMyArtistProfile);
        }
      }
    }, [guest, role]),
  );

  async function saveName() {
    await updateDisplayName(nameInput);
    setEditingName(false);
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — makes it harder to do accidentally.
            Alert.alert(
              'Are you absolutely sure?',
              'Your account, tickets, listings, and profile will be gone forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace('/auth');
                    } catch {
                      Alert.alert('Error', 'Could not delete account. Please try again or contact support.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function handleChangeRole() {
    Alert.alert('Change Role', 'This will take you back to role selection.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: async () => {
          await clearRole();
          router.replace('/onboarding');
        },
      },
    ]);
  }

  const followedPerformers = performers.filter(p => getFollowedIds().includes(p.id));
  const sections = ROLE_SECTIONS[role] ?? ROLE_SECTIONS.fan;
  const roleColor = ROLE_COLORS[role] ?? colors.teal;
  const roleLabel = ROLE_LABELS[role] ?? 'Fan';
  const initials = getInitials(displayNameFromMeta, email);
  const displayName = displayNameFromMeta || (email ? email.split('@')[0] : 'Guest');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

        {/* Avatar + name card */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 24,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 20,
        }}>
          {/* Avatar circle */}
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: roleColor,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Text style={{ color: colors.navy, fontSize: 28, fontWeight: '900' }}>{initials}</Text>
          </View>

          {/* Display name (editable) */}
          {editingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                style={{
                  color: colors.textPrimary,
                  fontSize: 18,
                  fontWeight: '700',
                  borderBottomWidth: 2,
                  borderBottomColor: colors.teal,
                  paddingBottom: 4,
                  minWidth: 120,
                  textAlign: 'center',
                }}
              />
              <Pressable onPress={saveName}>
                <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 15 }}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditingName(true)} style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>
                {displayName}{' '}
                <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '400' }}>✎</Text>
              </Text>
            </Pressable>
          )}

          {/* Role badge */}
          <View style={{
            backgroundColor: roleColor + '22',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: roleColor,
            marginBottom: 8,
          }}>
            <Text style={{ color: roleColor, fontWeight: '700', fontSize: 13 }}>{roleLabel}</Text>
          </View>

          {/* Auth method */}
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {guest ? 'Browsing as guest' : email ?? ''}
          </Text>

          {/* Guest upgrade prompt */}
          {guest && (
            <Pressable
              onPress={() => router.push('/auth')}
              style={{
                marginTop: 14,
                backgroundColor: colors.teal,
                borderRadius: 10,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: colors.navy, fontWeight: '800', fontSize: 14 }}>
                Create an Account
              </Text>
            </Pressable>
          )}
        </View>

        {/* Role-specific sections */}
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          {roleLabel.toUpperCase().replace(/[^A-Z ]/g, '').trim()} FEATURES
        </Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {sections.map((item) => {
            const isMyTickets       = item.label === 'My Tickets';
            const isPerformerProfile = item.label === 'Performer Profile';

            const sublabel = isMyTickets && myTickets.length > 0
              ? `${myTickets.length} ticket${myTickets.length === 1 ? '' : 's'} purchased`
              : isPerformerProfile && myArtistProfile
              ? myArtistProfile.stageName
              : isPerformerProfile && !myArtistProfile
              ? 'Tap to create your public artist page'
              : item.sublabel;

            const onPress = isMyTickets
              ? () => router.push('/(tabs)/tickets')
              : isPerformerProfile && myArtistProfile
              ? () => router.push(`/performer/${myArtistProfile.id}` as any)
              : isPerformerProfile
              ? () => router.push('/performer/create' as any)
              : () => Alert.alert('Coming Soon', `${item.label} will be available in a future update.`);

            const isActive = (isMyTickets && myTickets.length > 0) || (isPerformerProfile && !!myArtistProfile);
            return (
              <Pressable
                key={item.label}
                onPress={onPress}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isActive ? colors.teal + '55' : colors.border,
                  gap: 14,
                }}
              >
                <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{item.label}</Text>
                  <Text style={{ color: isActive ? colors.teal : colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                    {sublabel}
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Following section — only shown when the user follows at least one artist */}
        {followedPerformers.length > 0 && (
          <>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
              FOLLOWING ({followedPerformers.length})
            </Text>
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 24,
            }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 16 }}
              >
                {followedPerformers.map(p => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/performer/${p.id}`)}
                    style={{ alignItems: 'center', width: 68 }}
                  >
                    {p.photoUrl ? (
                      <Image
                        source={{ uri: p.photoUrl }}
                        style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: roleColor }}
                      />
                    ) : (
                      <View style={{
                        width: 56, height: 56, borderRadius: 28,
                        backgroundColor: roleColor + '33',
                        borderWidth: 2, borderColor: roleColor,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ color: roleColor, fontWeight: '800', fontSize: 18 }}>
                          {p.stageName.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text
                      numberOfLines={2}
                      style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6, textAlign: 'center', lineHeight: 14 }}
                    >
                      {p.stageName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* Upcoming tickets preview */}
        {myTickets.length > 0 && (
          <>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
              MY TICKETS ({myTickets.length})
            </Text>
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 24,
              overflow: 'hidden',
            }}>
              {myTickets.slice(0, 3).map((ticket, index) => {
                const ev = events.find(e => e.id === ticket.event_id);
                if (!ev) return null;
                const dateStr = new Date(ev.dateTimeStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <Pressable
                    key={ticket.id}
                    onPress={() => router.push('/(tabs)/tickets')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      gap: 12,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Image source={{ uri: ev.imageUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                        {ev.title}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        {dateStr} · {ev.city}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: colors.teal + '22',
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderWidth: 1,
                      borderColor: colors.teal,
                    }}>
                      <Text style={{ color: colors.teal, fontSize: 11, fontWeight: '700' }}>🎟️</Text>
                    </View>
                  </Pressable>
                );
              })}
              {myTickets.length > 3 && (
                <Pressable
                  onPress={() => router.push('/(tabs)/tickets')}
                  style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 13 }}>
                    View all {myTickets.length} tickets →
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* My Listings — only shown for artist/host with active listings */}
        {(role === 'artist' || role === 'host') && (
          <>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
              MY LISTINGS {myListings.length > 0 ? `(${myListings.length})` : ''}
            </Text>
            {myListings.length === 0 ? (
              <Pressable
                onPress={() => router.push('/marketplace/create')}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  marginBottom: 24,
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 24 }}>✦</Text>
                <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>List Something</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Post wigs, costumes, commissions & more</Text>
              </Pressable>
            ) : (
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 24,
                overflow: 'hidden',
              }}>
                {myListings.map((listing, index) => (
                  <View
                    key={listing.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      gap: 12,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Image
                      source={{ uri: listing.imageUrls[0] }}
                      style={{ width: 44, height: 44, borderRadius: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        {listing.price === 0 ? 'Commission' : `$${listing.price}`} · {listing.category}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() =>
                          Alert.alert('Mark as Sold?', `Remove "${listing.title}" from the marketplace?`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Mark Sold',
                              onPress: async () => {
                                await markSold(listing.id);
                                setMyListings(getMyListings());
                              },
                            },
                          ])
                        }
                        style={{ backgroundColor: colors.teal + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.teal }}
                      >
                        <Text style={{ color: colors.teal, fontSize: 11, fontWeight: '700' }}>Sold</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert('Delete Listing?', 'This will permanently remove your listing.', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                await deleteListing(listing.id);
                                setMyListings(getMyListings());
                              },
                            },
                          ])
                        }
                        style={{ backgroundColor: colors.danger + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.danger + '66' }}
                      >
                        <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Pressable
                  onPress={() => router.push('/marketplace/create')}
                  style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.teal, fontWeight: '700', fontSize: 13 }}>+ Add Another Listing</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {/* Settings */}
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
          ACCOUNT
        </Text>
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={handleChangeRole}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 22 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>Change Role</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>Switch between Fan, Artist, or Host</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>

          <Pressable
            onPress={handleSignOut}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 22 }}>🚪</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>Sign Out</Text>
            </View>
          </Pressable>

          {/* Delete account — only shown to authenticated (non-guest) users */}
          {!guest && (
            <Pressable
              onPress={handleDeleteAccount}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.danger + '55',
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 22 }}>🗑️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>Delete Account</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>Permanently remove your account and data</Text>
              </View>
            </Pressable>
          )}

          {/* Community Resources */}
          <Pressable
            onPress={() => router.push('/resources' as any)}
            style={{
              backgroundColor: '#4C1D95',
              borderRadius: 14,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#7C3AED',
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 22 }}>🏳️‍🌈</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E9D5FF', fontWeight: '800', fontSize: 15 }}>Community Resources</Text>
              <Text style={{ color: '#C4B5FD', fontSize: 13, marginTop: 2 }}>Crisis lines, Portland orgs, health & legal support</Text>
            </View>
            <Text style={{ color: '#A78BFA', fontSize: 18 }}>›</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
