// app/event/create/roles.tsx
// Step 4 of event creation: define needed roles, set pay, invite talent.
// Sits between Ticketing and Review.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/PrimaryButton';
import {
  getDraft,
  updateDraft,
  type DraftEventRole,
} from '../../../lib/createEventStore';
import {
  ROLE_TYPES,
  SUGGESTED_PAY,
  roleLabel,
  roleEmoji,
  type RoleKey,
} from '../../../lib/eventRolesStore';
import {
  loadPerformers,
  getPerformers,
  type PerformerRecord,
} from '../../../lib/performerStore';
import { colors as C } from '../../../src/theme/colors';

const GOLD = '#F59E0B';

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleRow({
  role,
  onUpdate,
  onRemove,
  onInvite,
  invitedNames,
}: {
  role: DraftEventRole;
  onUpdate: (patch: Partial<DraftEventRole>) => void;
  onRemove: () => void;
  onInvite: () => void;
  invitedNames: string[];
}) {
  const suggest = SUGGESTED_PAY[role.roleName] ?? { min: 0, max: 0 };
  const hasRange = suggest.min > 0 || suggest.max > 0;

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18 }}>{roleEmoji(role.roleName)}</Text>
          <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>
            {role.customName || roleLabel(role.roleName)}
          </Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={10}>
          <Ionicons name="close-circle" size={22} color={C.textMuted} />
        </Pressable>
      </View>

      {/* Slots + pay */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>OPEN SLOTS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => onUpdate({ slots: Math.max(1, role.slots - 1) })}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ color: C.textPrimary, fontSize: 18, lineHeight: 20 }}>−</Text>
            </Pressable>
            <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 18, minWidth: 20, textAlign: 'center' }}>{role.slots}</Text>
            <Pressable
              onPress={() => onUpdate({ slots: role.slots + 1 })}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ color: C.textPrimary, fontSize: 18, lineHeight: 20 }}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
            PAY OFFER {hasRange ? `($${suggest.min}–$${suggest.max} typical)` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: C.textMuted, fontSize: 15 }}>$</Text>
            <TextInput
              value={role.payAmount > 0 ? role.payAmount.toString() : ''}
              onChangeText={t => onUpdate({ payAmount: parseFloat(t) || 0 })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={C.textMuted}
              style={{
                flex: 1,
                backgroundColor: C.navy,
                borderRadius: 8,
                padding: 8,
                color: C.textPrimary,
                fontSize: 15,
                fontWeight: '700',
              }}
            />
          </View>
        </View>
      </View>

      {/* Custom name for 'other' */}
      {role.roleName === 'other' && (
        <TextInput
          value={role.customName ?? ''}
          onChangeText={t => onUpdate({ customName: t })}
          placeholder="Describe this role (e.g. Stage Manager)"
          placeholderTextColor={C.textMuted}
          style={{
            backgroundColor: C.navy,
            borderRadius: 8,
            padding: 10,
            color: C.textPrimary,
            fontSize: 14,
            marginBottom: 10,
          }}
        />
      )}

      {/* Invited talent chips */}
      {invitedNames.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {invitedNames.map(name => (
            <View key={name} style={{ backgroundColor: C.teal + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: C.teal, fontSize: 12, fontWeight: '700' }}>{name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Invite button */}
      <Pressable
        onPress={onInvite}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.teal + '88',
          backgroundColor: C.teal + '11',
          alignSelf: 'flex-start',
        }}
      >
        <Ionicons name="person-add-outline" size={14} color={C.teal} />
        <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13 }}>
          {invitedNames.length > 0 ? 'Add more talent' : 'Invite talent'}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Talent picker modal ──────────────────────────────────────────────────────

function TalentPickerSheet({
  roleLabel: label,
  alreadyInvited,
  previousCollabs,
  onSelect,
  onClose,
}: {
  roleLabel: string;
  alreadyInvited: string[];
  previousCollabs: string[];
  onSelect: (talentId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const all = getPerformers();

  const sorted = [...all].sort((a, b) => {
    const aPrev = previousCollabs.includes(a.id) ? 0 : 1;
    const bPrev = previousCollabs.includes(b.id) ? 0 : 1;
    return aPrev - bPrev || a.stageName.localeCompare(b.stageName);
  });

  const filtered = sorted.filter(p =>
    p.stageName.toLowerCase().includes(query.toLowerCase()) &&
    !alreadyInvited.includes(p.id),
  );

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: C.navy, zIndex: 100,
    }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border }}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={C.teal} />
          </Pressable>
          <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 17, marginLeft: 12 }}>
            Invite talent — {label}
          </Text>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 10, gap: 8 }}>
            <Ionicons name="search" size={16} color={C.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search talent..."
              placeholderTextColor={C.textMuted}
              style={{ flex: 1, paddingVertical: 10, color: C.textPrimary, fontSize: 15 }}
              autoFocus
            />
          </View>
        </View>

        {previousCollabs.length > 0 && !query && (
          <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', paddingHorizontal: 16, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Previous collaborators ✦
          </Text>
        )}

        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          renderItem={({ item: p }) => (
            <Pressable
              onPress={() => onSelect(p.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: C.border,
                gap: 12,
              }}
            >
              {p.photoUrl ? (
                <Image source={{ uri: p.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>💃</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontWeight: '800', fontSize: 15 }}>{p.stageName}</Text>
                {previousCollabs.includes(p.id) && (
                  <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700' }}>✦ Previous collaborator</Text>
                )}
              </View>
              <Ionicons name="add-circle-outline" size={22} color={C.teal} />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 40 }}>
              No talent found{query ? ` for "${query}"` : ''}
            </Text>
          }
        />
      </SafeAreaView>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CreateEvent_Roles() {
  const d = getDraft();
  const [roles, setRoles] = useState<DraftEventRole[]>(d.eventRoles ?? []);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<number | null>(null); // index of role being staffed
  const [loadingTalent, setLoadingTalent] = useState(true);
  const [previousCollabs] = useState<string[]>([]); // loaded from store when host session available

  useEffect(() => {
    loadPerformers().finally(() => setLoadingTalent(false));
  }, []);

  // ── Role management ───────────────────────────────────────────────────────

  function addRole(key: RoleKey) {
    const suggest = SUGGESTED_PAY[key] ?? { min: 0, max: 0 };
    const defaultPay = suggest.min > 0 ? suggest.min : 0;
    setRoles(prev => [...prev, {
      roleName: key,
      slots: 1,
      payAmount: defaultPay,
      invitedTalentIds: [],
    }]);
    setShowRolePicker(false);
  }

  function updateRole(index: number, patch: Partial<DraftEventRole>) {
    setRoles(prev => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
  }

  function removeRole(index: number) {
    setRoles(prev => prev.filter((_, i) => i !== index));
  }

  function inviteTalentToRole(talentId: string) {
    if (inviteTarget === null) return;
    setRoles(prev => prev.map((r, i) => {
      if (i !== inviteTarget) return r;
      if (r.invitedTalentIds.includes(talentId)) return r;
      return { ...r, invitedTalentIds: [...r.invitedTalentIds, talentId] };
    }));
    setInviteTarget(null);
  }

  // ── Proceed to review ─────────────────────────────────────────────────────

  function onProceed() {
    updateDraft({ eventRoles: roles });
    router.push('/event/create/review');
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const allPerformers = getPerformers();

  function getInvitedNames(role: DraftEventRole): string[] {
    return role.invitedTalentIds
      .map(id => allPerformers.find(p => p.id === id)?.stageName)
      .filter(Boolean) as string[];
  }

  const currentInviteRole = inviteTarget !== null ? roles[inviteTarget] : null;
  const currentInviteAlready = currentInviteRole?.invitedTalentIds ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        <Text style={{ color: C.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 4 }}>
          Roles & Lineup
        </Text>
        <Text style={{ color: C.textMuted, lineHeight: 20, marginBottom: 24 }}>
          Define what positions you need filled, set your pay offer, and invite talent. You can always add more after publishing.
        </Text>

        {/* Role cards */}
        {roles.map((role, i) => (
          <RoleRow
            key={`${role.roleName}-${i}`}
            role={role}
            onUpdate={patch => updateRole(i, patch)}
            onRemove={() => removeRole(i)}
            onInvite={() => setInviteTarget(i)}
            invitedNames={getInvitedNames(role)}
          />
        ))}

        {/* Add role button */}
        <Pressable
          onPress={() => setShowRolePicker(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: C.teal + '88',
            borderStyle: 'dashed',
            marginBottom: 28,
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color={C.teal} />
          <Text style={{ color: C.teal, fontWeight: '800', fontSize: 15 }}>Add a role</Text>
        </Pressable>

        <PrimaryButton title="Review & Publish →" onPress={onProceed} />
        <View style={{ height: 8 }} />
        <Pressable onPress={() => onProceed()} style={{ paddingVertical: 8 }}>
          <Text style={{ color: C.textSecondary, textAlign: 'center', fontSize: 13 }}>
            Skip — I'll staff this later
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Role type picker overlay ── */}
      {showRolePicker && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', zIndex: 50,
        }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, paddingBottom: 40 }}>
            <Text style={{ color: C.textPrimary, fontWeight: '900', fontSize: 18, marginBottom: 16 }}>
              Add a role
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {ROLE_TYPES.map(rt => (
                <Pressable
                  key={rt.key}
                  onPress={() => addRole(rt.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: C.navy,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{rt.emoji}</Text>
                  <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 14 }}>{rt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowRolePicker(false)} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: C.textMuted, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Talent picker overlay ── */}
      {inviteTarget !== null && currentInviteRole && !loadingTalent && (
        <TalentPickerSheet
          roleLabel={currentInviteRole.customName || roleLabel(currentInviteRole.roleName)}
          alreadyInvited={currentInviteAlready}
          previousCollabs={previousCollabs}
          onSelect={inviteTalentToRole}
          onClose={() => setInviteTarget(null)}
        />
      )}
    </SafeAreaView>
  );
}
