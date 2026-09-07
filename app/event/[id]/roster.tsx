// app/event/[id]/roster.tsx
// Host-only event roster: shows every role, who's filled it, open slots, pay status.
// Allows host to remove staff and invite new staff without leaving the screen.

import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  inviteTalentToRole,
  loadEventRoles,
  loadEventTalent,
  removeEventTalent,
  roleEmoji,
  roleLabel,
  type EventRole,
  type EventTalentInvite,
} from '../../../lib/eventRolesStore';
import { fetchEventById, type EventRecord } from '../../../lib/eventsStore';
import { loadPerformers, getPerformers, type PerformerRecord } from '../../../lib/performerStore';
import { colors as C } from '../../../src/theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return 'Date TBD';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function statusColor(status: string) {
  switch (status) {
    case 'accepted': return '#34D399';
    case 'invited':  return C.teal;
    case 'declined': return '#F87171';
    case 'removed':  return C.textMuted;
    default:         return C.textMuted;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'accepted': return '✓ Confirmed';
    case 'invited':  return '⏳ Pending';
    case 'declined': return '✕ Declined';
    case 'removed':  return '— Removed';
    default:         return status;
  }
}

function openVenmo(handle: string, amount: number, note: string) {
  const clean = handle.replace(/^@/, '');
  const url = `venmo://paycharge?txn=pay&recipients=${clean}&amount=${amount}&note=${encodeURIComponent(note)}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://venmo.com/${clean}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`),
  );
}

function openSMS(phone: string, body?: string) {
  const clean = phone.replace(/\D/g, '');
  const encoded = body ? encodeURIComponent(body) : '';
  Linking.openURL(`sms:${clean}${encoded ? `?&body=${encoded}` : ''}`).catch(() =>
    Alert.alert('Cannot open SMS', 'Your device does not support SMS.'),
  );
}

function openWhatsApp(phone: string, body?: string) {
  const clean = phone.replace(/\D/g, '');
  const encoded = body ? encodeURIComponent(body) : '';
  Linking.openURL(`whatsapp://send?phone=${clean}${encoded ? `&text=${encoded}` : ''}`).catch(() =>
    Linking.openURL(`https://wa.me/${clean}${encoded ? `?text=${encoded}` : ''}`).catch(() =>
      Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this feature.'),
    ),
  );
}

// ─── Cost Estimator Card ─────────────────────────────────────────────────────

function CostEstimatorCard({
  roles,
  talent,
  capacity,
  currentTicketPrice,
}: {
  roles: EventRole[];
  talent: EventTalentInvite[];
  capacity?: number;
  currentTicketPrice?: number;
}) {
  const [expanded,      setExpanded]      = useState(true);
  // Editable ticket count — defaults to venue capacity, overrideable by the host
  const [ticketsInput,  setTicketsInput]  = useState(capacity ? String(capacity) : '');

  // Parse the live input — clamp to a positive integer
  const ticketsToSell = Math.max(1, parseInt(ticketsInput, 10) || 0);
  const inputIsValid  = ticketsToSell > 0 && ticketsInput.trim() !== '';

  // Total estimated cost if every slot fills at the posted rate
  const maxEstimate = roles.reduce((sum, r) => sum + r.slots * r.payAmount, 0);

  // What's already locked in (accepted invites with agreed pay)
  const committed = talent
    .filter(t => t.status === 'accepted' && t.payAgreed)
    .reduce((s, t) => s + (t.payAgreed ?? 0), 0);

  // Pending (invited but not yet responded)
  const pending = talent
    .filter(t => t.status === 'invited' && t.payAgreed)
    .reduce((s, t) => s + (t.payAgreed ?? 0), 0);

  // Live ticket price scenarios — driven by ticketsToSell
  const canCalc   = inputIsValid && maxEstimate > 0;
  const breakEven = canCalc ? maxEstimate / ticketsToSell : null;
  const buffer25  = canCalc ? (maxEstimate * 1.25) / ticketsToSell : null;
  const buffer50  = canCalc ? (maxEstimate * 1.5) / ticketsToSell : null;

  // Venue cap vs planned sales comparison
  const overCapacity = capacity && ticketsToSell > capacity;

  // Roles that have no pay set
  const unpaidRoles = roles.filter(r => r.payAmount === 0);

  if (roles.length === 0 || maxEstimate === 0) return null;

  function ticketPill(amount: number, label: string, sublabel: string, color: string) {
    const isCurrent = currentTicketPrice !== undefined && Math.ceil(amount) === currentTicketPrice;
    return (
      <View style={{
        flex: 1,
        backgroundColor: color + '18',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
        borderWidth: isCurrent ? 2 : 1,
        borderColor: isCurrent ? color : color + '44',
      }}>
        <Text style={{ color, fontWeight: '900', fontSize: 19 }}>${Math.ceil(amount)}</Text>
        <Text style={{ color, fontSize: 10, fontWeight: '800', marginTop: 2 }}>{label}</Text>
        <Text style={{ color: C.textMuted, fontSize: 9, marginTop: 1, textAlign: 'center' }}>{sublabel}</Text>
        {isCurrent && (
          <Text style={{ color, fontSize: 9, fontWeight: '800', marginTop: 3 }}>← current price</Text>
        )}
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.teal + '44',
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      {/* Collapse header */}
      <Pressable
        onPress={() => setExpanded(e => !e)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
          borderBottomWidth: expanded ? 1 : 0,
          borderBottomColor: C.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16 }}>💰</Text>
          <View>
            <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 14 }}>
              Cost & Ticket Estimator
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>
              Max staff cost:{' '}
              <Text style={{ color: C.coral, fontWeight: '700' }}>${maxEstimate.toFixed(0)}</Text>
              {committed > 0 && (
                <Text style={{ color: C.textMuted }}>
                  {' · '}
                  <Text style={{ color: '#34D399', fontWeight: '700' }}>${committed.toFixed(0)} locked in</Text>
                </Text>
              )}
            </Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
      </Pressable>

      {expanded && (
        <View style={{ padding: 14 }}>

          {/* ── Per-role cost breakdown ─────────────────────── */}
          <Text style={estimatorLabel}>Staff Cost Breakdown</Text>
          {roles.map(role => {
            const roleCost        = role.slots * role.payAmount;
            const confirmedForRole = talent
              .filter(t => t.eventRoleId === role.id && t.status === 'accepted' && t.payAgreed)
              .reduce((s, t) => s + (t.payAgreed ?? 0), 0);

            return (
              <View key={role.id} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 9,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>{roleEmoji(role.roleName)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 13 }}>
                    {role.customName || roleLabel(role.roleName)}
                  </Text>
                  <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>
                    {role.slots} slot{role.slots !== 1 ? 's' : ''} × ${role.payAmount.toFixed(0)}
                    {confirmedForRole > 0 && (
                      <Text style={{ color: '#34D399' }}>
                        {' · '}${confirmedForRole.toFixed(0)} confirmed
                      </Text>
                    )}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {role.payAmount > 0 ? (
                    <Text style={{ color: C.coral, fontWeight: '800', fontSize: 14 }}>
                      ${roleCost.toFixed(0)}
                    </Text>
                  ) : (
                    <Text style={{ color: C.textMuted, fontSize: 12, fontStyle: 'italic' }}>Unpaid</Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* ── Cost totals ─────────────────────────────────── */}
          <View style={{ marginTop: 12, gap: 4 }}>
            {committed > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.textSecondary, fontSize: 12 }}>✓ Confirmed</Text>
                <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 12 }}>${committed.toFixed(0)}</Text>
              </View>
            )}
            {pending > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.textSecondary, fontSize: 12 }}>⏳ Pending</Text>
                <Text style={{ color: C.teal, fontWeight: '700', fontSize: 12 }}>${pending.toFixed(0)}</Text>
              </View>
            )}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between',
              marginTop: 6, paddingTop: 8,
              borderTopWidth: 1, borderTopColor: C.border,
            }}>
              <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 14 }}>Max if all accept</Text>
              <Text style={{ color: C.coral, fontWeight: '900', fontSize: 14 }}>${maxEstimate.toFixed(0)}</Text>
            </View>
          </View>

          {/* ── Ticket count input ──────────────────────────── */}
          <View style={{
            marginTop: 18,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}>
            <Text style={estimatorLabel}>Tickets to Sell</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Input */}
              <View style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: C.navy,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: overCapacity ? '#F87171' : C.teal + '55',
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}>
                <TextInput
                  value={ticketsInput}
                  onChangeText={setTicketsInput}
                  keyboardType="number-pad"
                  placeholder="e.g. 80"
                  placeholderTextColor={C.textMuted}
                  returnKeyType="done"
                  style={{
                    flex: 1,
                    color: C.textPrimary,
                    fontWeight: '800',
                    fontSize: 20,
                  }}
                />
                <Text style={{ color: C.textMuted, fontSize: 12 }}>tickets</Text>
              </View>

              {/* Venue cap reference */}
              {capacity && (
                <Pressable
                  onPress={() => setTicketsInput(String(capacity))}
                  style={{
                    backgroundColor: C.teal + '18',
                    borderRadius: 10,
                    padding: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: C.teal + '44',
                  }}
                >
                  <Text style={{ color: C.teal, fontWeight: '800', fontSize: 16 }}>{capacity}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 9, marginTop: 1 }}>venue cap</Text>
                </Pressable>
              )}
            </View>

            {/* Over-capacity warning */}
            {overCapacity && (
              <Text style={{ color: '#F87171', fontSize: 11, marginTop: 6 }}>
                ⚠ That exceeds your venue capacity of {capacity}
              </Text>
            )}

            {/* No capacity set nudge */}
            {!capacity && ticketsInput === '' && (
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>
                No venue capacity set — enter a ticket count to see pricing.
              </Text>
            )}
          </View>

          {/* ── Ticket price scenarios ──────────────────────── */}
          {canCalc && breakEven !== null && buffer25 !== null && buffer50 !== null && (
            <View style={{ marginTop: 14 }}>
              <Text style={estimatorLabel}>
                Recommended Ticket Price · {ticketsToSell} tickets
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ticketPill(breakEven, 'Break Even', 'covers staff only', '#F59E0B')}
                {ticketPill(buffer25, '+25% margin', 'covers extras', C.coral)}
                {ticketPill(buffer50, '+50% margin', 'profitable show', '#34D399')}
              </View>
              <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 10, lineHeight: 15, textAlign: 'center' }}>
                = max staff cost ÷ {ticketsToSell} tickets
                {unpaidRoles.length > 0 ? ` · ${unpaidRoles.length} unpaid role${unpaidRoles.length > 1 ? 's' : ''} excluded` : ''}.
                {'\n'}Buffer covers venue, supplies, and unexpected costs.
              </Text>
            </View>
          )}

          {/* Placeholder if no input yet */}
          {!canCalc && ticketsInput !== '' && (
            <View style={{
              marginTop: 12, backgroundColor: C.navy, borderRadius: 10, padding: 12,
              borderWidth: 1, borderColor: C.border,
            }}>
              <Text style={{ color: C.textMuted, fontSize: 12, textAlign: 'center' }}>
                Enter a valid ticket count above to see pricing.
              </Text>
            </View>
          )}

        </View>
      )}
    </View>
  );
}

const estimatorLabel = {
  color: '#9CA3AF',
  fontSize: 10,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  marginBottom: 10,
};

// ─── Talent row within a role section ────────────────────────────────────────

function TalentRow({
  invite,
  eventTitle,
  onRemove,
}: {
  invite: EventTalentInvite;
  eventTitle: string;
  onRemove: () => void;
}) {
  const isActive   = invite.status === 'accepted' || invite.status === 'invited';
  const isAccepted = invite.status === 'accepted';
  const hasPhone   = !!invite.phoneNumber;

  function handlePay() {
    if (!invite.payAgreed) {
      Alert.alert('No pay set', 'Pay was not agreed upon for this invite.');
      return;
    }
    Alert.alert(
      `Pay ${invite.stageName ?? 'staff'}`,
      `Send $${invite.payAgreed.toFixed(2)} via Venmo?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Venmo',
          onPress: () => openVenmo(
            invite.stageName ?? 'sequins',
            invite.payAgreed!,
            `Payment for ${eventTitle}`,
          ),
        },
      ],
    );
  }

  function handleContact() {
    if (!hasPhone) return;
    Alert.alert(
      `Contact ${invite.stageName ?? 'Staff'}`,
      invite.phoneNumber,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '💬 SMS',
          onPress: () => openSMS(invite.phoneNumber!, `Hi! This is about ${eventTitle}.`),
        },
        {
          text: '📱 WhatsApp',
          onPress: () => openWhatsApp(invite.phoneNumber!, `Hi! This is about ${eventTitle}.`),
        },
      ],
    );
  }

  function handleRemove() {
    Alert.alert(
      'Remove from roster?',
      `Remove ${invite.stageName ?? 'this person'} from the event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ],
    );
  }

  return (
    <View style={{
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      opacity: isActive ? 1 : 0.5,
    }}>
      {/* Top row: avatar + name + pay chip + action buttons */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {invite.photoUrl ? (
          <Image source={{ uri: invite.photoUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
        ) : (
          <View style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: C.border,
          }}>
            <Text style={{ fontSize: 18 }}>💃</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 14 }}>
            {invite.stageName ?? 'Unknown Talent'}
          </Text>
          <Text style={{ color: statusColor(invite.status), fontSize: 12, marginTop: 1 }}>
            {statusLabel(invite.status)}
          </Text>
        </View>

        {invite.payAgreed !== undefined && (
          <View style={{
            backgroundColor: C.teal + '22', borderRadius: 8,
            paddingHorizontal: 8, paddingVertical: 3,
            borderWidth: 1, borderColor: C.teal + '55',
          }}>
            <Text style={{ color: C.teal, fontWeight: '800', fontSize: 12 }}>
              ${invite.payAgreed.toFixed(0)}
            </Text>
          </View>
        )}

        {isAccepted && (
          <Pressable
            onPress={handlePay}
            style={{
              backgroundColor: '#34D399' + '22', borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 6,
              borderWidth: 1, borderColor: '#34D399' + '55',
            }}
          >
            <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 12 }}>Pay</Text>
          </Pressable>
        )}
        {isActive && (
          <Pressable onPress={handleRemove} style={{ paddingHorizontal: 4, paddingVertical: 6 }}>
            <Ionicons name="close-circle" size={20} color={C.danger} />
          </Pressable>
        )}
      </View>

      {/* Contact row — only shown if phone is available */}
      {hasPhone && isActive && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginLeft: 48 }}>
          <Pressable
            onPress={() => openSMS(invite.phoneNumber!, `Hi! This is about ${eventTitle}.`)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: '#3B82F6' + '18', borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 5,
              borderWidth: 1, borderColor: '#3B82F6' + '44',
            }}
          >
            <Text style={{ fontSize: 12 }}>💬</Text>
            <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 11 }}>SMS</Text>
          </Pressable>
          <Pressable
            onPress={() => openWhatsApp(invite.phoneNumber!, `Hi! This is about ${eventTitle}.`)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: '#25D366' + '18', borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 5,
              borderWidth: 1, borderColor: '#25D366' + '44',
            }}
          >
            <Text style={{ fontSize: 12 }}>📱</Text>
            <Text style={{ color: '#25D366', fontWeight: '700', fontSize: 11 }}>WhatsApp</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Role section card ────────────────────────────────────────────────────────

function RoleSection({
  role,
  invites,
  eventTitle,
  onRemoveTalent,
  onInviteMore,
}: {
  role: EventRole;
  invites: EventTalentInvite[];
  eventTitle: string;
  onRemoveTalent: (inviteId: string) => void;
  onInviteMore: (role: EventRole) => void;
}) {
  const active   = invites.filter(i => i.status === 'accepted' || i.status === 'invited');
  const accepted = invites.filter(i => i.status === 'accepted');
  const declined = invites.filter(i => i.status === 'declined' || i.status === 'removed');
  const openSlots = Math.max(0, role.slots - accepted.length);
  const isFull   = openSlots === 0;

  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 14,
      borderWidth: 1, borderColor: isFull ? '#34D399' + '44' : C.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontSize: 20, marginRight: 8 }}>{roleEmoji(role.roleName)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
            {role.customName || roleLabel(role.roleName)}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>
            {accepted.length}/{role.slots} filled
            {role.payAmount > 0 ? ` · $${role.payAmount.toFixed(0)}/show` : ' · Unpaid'}
          </Text>
        </View>
        <View style={{
          backgroundColor: isFull ? '#34D399' + '22' : C.teal + '22',
          borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
          borderWidth: 1, borderColor: isFull ? '#34D399' + '55' : C.teal + '44',
        }}>
          <Text style={{ color: isFull ? '#34D399' : C.teal, fontWeight: '800', fontSize: 12 }}>
            {isFull ? '✓ Full' : `${openSlots} open`}
          </Text>
        </View>
      </View>

      {active.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {active.map(inv => (
            <TalentRow
              key={inv.id}
              invite={inv}
              eventTitle={eventTitle}
              onRemove={() => onRemoveTalent(inv.id)}
            />
          ))}
        </View>
      )}

      {declined.length > 0 && (
        <View style={{ marginTop: 8, opacity: 0.45 }}>
          {declined.map(inv => (
            <TalentRow key={inv.id} invite={inv} eventTitle={eventTitle} onRemove={() => {}} />
          ))}
        </View>
      )}

      {invites.length === 0 && (
        <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10, marginBottom: 4 }}>
          No one invited yet for this role.
        </Text>
      )}

      {!isFull && (
        <Pressable
          onPress={() => onInviteMore(role)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginTop: 12, paddingVertical: 9,
            borderRadius: 10, borderWidth: 1.5, borderColor: C.teal,
          }}
        >
          <Ionicons name="person-add-outline" size={15} color={C.teal} />
          <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13 }}>
            Invite to {role.customName || roleLabel(role.roleName)}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Invite sheet ─────────────────────────────────────────────────────────────

function InviteSheet({
  visible,
  role,
  eventId,
  eventTitle,
  payAmount,
  alreadyInvited,
  onClose,
  onInvited,
}: {
  visible: boolean;
  role: EventRole | null;
  eventId: string;
  eventTitle: string;
  payAmount: number;
  alreadyInvited: string[];   // talentIds already on this role
  onClose: () => void;
  onInvited: (invite: EventTalentInvite) => void;
}) {
  const [search,    setSearch]    = useState('');
  const [allTalent, setAllTalent] = useState<PerformerRecord[]>([]);
  const [sending,   setSending]   = useState<string | null>(null); // talentId being invited

  useEffect(() => {
    if (!visible) { setSearch(''); return; }
    const cached = getPerformers();
    if (cached.length > 0) { setAllTalent(cached); return; }
    loadPerformers().then(() => setAllTalent(getPerformers()));
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allTalent.filter(p =>
      !alreadyInvited.includes(p.id) &&
      (q === '' || p.stageName.toLowerCase().includes(q)),
    );
  }, [allTalent, search, alreadyInvited]);

  async function handleInvite(performer: PerformerRecord) {
    if (!role) return;
    setSending(performer.id);
    try {
      const inv = await inviteTalentToRole({
        eventId,
        eventRoleId: role.id,
        talentId:    performer.id,
        payAmount,
        eventTitle,
        roleName:    role.roleName,
      });
      onInvited({ ...inv, stageName: performer.stageName, photoUrl: performer.photoUrl });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send invite.');
    } finally {
      setSending(null);
    }
  }

  if (!role) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.textPrimary, fontWeight: '900', fontSize: 17 }}>
              Invite {role.customName || roleLabel(role.roleName)}
            </Text>
            {payAmount > 0 && (
              <Text style={{ color: C.teal, fontSize: 13, marginTop: 2 }}>
                ${payAmount.toFixed(0)}/show · tap a performer to invite
              </Text>
            )}
          </View>
          <Pressable onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={24} color={C.textMuted} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ padding: 12 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by stage name…"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            style={{
              backgroundColor: C.surface, borderRadius: 10,
              paddingHorizontal: 14, paddingVertical: 10,
              color: C.textPrimary, fontSize: 15,
              borderWidth: 1, borderColor: C.border,
            }}
          />
        </View>

        {/* Talent list */}
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: C.textMuted, fontSize: 15 }}>
                {search ? 'No performers match your search.' : 'No talent profiles found.'}
              </Text>
            </View>
          }
          renderItem={({ item: p }) => {
            const isSending = sending === p.id;
            return (
              <Pressable
                onPress={() => handleInvite(p)}
                disabled={!!sending}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: C.surface, borderRadius: 12,
                  padding: 12, marginBottom: 8,
                  borderWidth: 1, borderColor: C.border,
                  opacity: sending && !isSending ? 0.5 : 1,
                }}
              >
                {p.photoUrl ? (
                  <Image source={{ uri: p.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                ) : (
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: C.border,
                  }}>
                    <Text style={{ fontSize: 20 }}>💃</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 15 }}>{p.stageName}</Text>
                  {p.city && <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>📍 {p.city}</Text>}
                </View>
                {isSending ? (
                  <ActivityIndicator color={C.teal} size="small" />
                ) : (
                  <View style={{
                    backgroundColor: C.teal + '22', borderRadius: 8,
                    paddingHorizontal: 12, paddingVertical: 6,
                    borderWidth: 1, borderColor: C.teal + '55',
                  }}>
                    <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13 }}>Invite</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RosterScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();

  const [event,      setEvent]      = useState<EventRecord | null>(null);
  const [roles,      setRoles]      = useState<EventRole[]>([]);
  const [talent,     setTalent]     = useState<EventTalentInvite[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Invite sheet state
  const [sheetRole, setSheetRole] = useState<EventRole | null>(null);

  async function loadAll(showSpinner = false) {
    if (!eventId) return;
    if (showSpinner) setLoading(true);
    try {
      const [ev, r, t] = await Promise.all([
        fetchEventById(eventId),
        loadEventRoles(eventId),
        loadEventTalent(eventId),
      ]);
      setEvent(ev);
      setRoles(r);
      setTalent(t);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load roster.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(true); }, [eventId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [eventId]);

  async function handleRemove(inviteId: string) {
    try {
      await removeEventTalent(inviteId);
      setTalent(prev => prev.map(t => t.id === inviteId ? { ...t, status: 'removed' } : t));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not remove staff member.');
    }
  }

  function handleInviteAdded(invite: EventTalentInvite) {
    setTalent(prev => [...prev, invite]);
  }

  // ── Derived stats ──
  const allAccepted = talent.filter(t => t.status === 'accepted').length;
  const allPending  = talent.filter(t => t.status === 'invited').length;
  const totalSlots  = roles.reduce((s, r) => s + r.slots, 0);
  const totalPayout = talent
    .filter(t => t.status === 'accepted' && t.payAgreed)
    .reduce((s, t) => s + (t.payAgreed ?? 0), 0);

  // Already-invited talent IDs per role (to hide from invite sheet)
  const invitedForRole = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of talent) {
      if (t.status !== 'removed' && t.talentId) {
        if (!map[t.eventRoleId]) map[t.eventRoleId] = [];
        map[t.eventRoleId].push(t.talentId);
      }
    }
    return map;
  }, [talent]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <Stack.Screen options={{
          title: 'Staff Roster',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingRight: 16, paddingVertical: 4 }}>
              <Text style={{ color: C.teal, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
            </Pressable>
          ),
        }} />
        <ActivityIndicator color={C.teal} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <Stack.Screen
        options={{
          title: 'Staff Roster',
          headerStyle: { backgroundColor: C.navy },
          headerTitleStyle: { color: C.textPrimary },
          headerTintColor: C.teal,
          headerBackTitle: 'Back',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingRight: 16, paddingVertical: 4 }}>
              <Text style={{ color: C.teal, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
            </Pressable>
          ),
        }}
      />

      {/* Invite sheet modal */}
      <InviteSheet
        visible={!!sheetRole}
        role={sheetRole}
        eventId={eventId ?? ''}
        eventTitle={event?.title ?? 'Event'}
        payAmount={sheetRole?.payAmount ?? 0}
        alreadyInvited={sheetRole ? (invitedForRole[sheetRole.id] ?? []) : []}
        onClose={() => setSheetRole(null)}
        onInvited={handleInviteAdded}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
      >
        {/* Event header */}
        <Text style={{ color: C.textPrimary, fontSize: 20, fontWeight: '900' }} numberOfLines={2}>
          {event?.title ?? 'Event Roster'}
        </Text>
        {event?.datetimeStart && (
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 3 }}>
            📅 {formatDate(event.datetimeStart)}
          </Text>
        )}
        {event?.venue?.name && (
          <Text style={{ color: C.textMuted, fontSize: 13 }}>
            📍 {event.venue.name}
          </Text>
        )}

        {/* Stats bar */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20 }}>
          {[
            { label: 'Confirmed',   value: allAccepted,                           color: '#34D399' },
            { label: 'Pending',     value: allPending,                            color: C.teal    },
            { label: 'Open Slots',  value: Math.max(0, totalSlots - allAccepted), color: C.textMuted },
            { label: 'Est. Payout', value: `$${totalPayout.toFixed(0)}`,          color: C.coral   },
          ].map(stat => (
            <View key={stat.label} style={{
              flex: 1, backgroundColor: C.surface, borderRadius: 12,
              padding: 10, alignItems: 'center',
              borderWidth: 1, borderColor: C.border,
            }}>
              <Text style={{ color: stat.color, fontSize: 18, fontWeight: '900' }}>{stat.value}</Text>
              <Text style={{ color: C.textMuted, fontSize: 9, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Cost & ticket estimator */}
        <CostEstimatorCard
          roles={roles}
          talent={talent}
          capacity={event?.capacity}
          currentTicketPrice={event?.ticketing?.price}
        />

        {/* No roles yet */}
        {roles.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text>
            <Text style={{ color: C.textPrimary, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
              No roles defined
            </Text>
            <Text style={{ color: C.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              Edit the event to add roles and invite staff.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={{
                marginTop: 20, backgroundColor: C.teal, borderRadius: 12,
                paddingHorizontal: 24, paddingVertical: 12,
              }}
            >
              <Text style={{ color: C.navy, fontWeight: '800', fontSize: 14 }}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
          roles.map(role => (
            <RoleSection
              key={role.id}
              role={role}
              invites={talent.filter(t => t.eventRoleId === role.id)}
              eventTitle={event?.title ?? 'Event'}
              onRemoveTalent={handleRemove}
              onInviteMore={role => setSheetRole(role)}
            />
          ))
        )}

        {/* Pay all confirmed staff CTA */}
        {allAccepted > 0 && totalPayout > 0 && (
          <View style={{
            backgroundColor: '#34D399' + '10', borderRadius: 14, padding: 16,
            borderWidth: 1, borderColor: '#34D399' + '44', marginTop: 8,
          }}>
            <Text style={{ color: '#34D399', fontWeight: '800', fontSize: 14, marginBottom: 4 }}>
              💸 Ready to pay your crew?
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 19 }}>
              {allAccepted} confirmed staff · estimated ${totalPayout.toFixed(0)} total.
              Tap each staff member's "Pay" button above to send via Venmo.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
