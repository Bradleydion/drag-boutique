// lib/eventRolesStore.ts
// Manages event_roles and event_talent — the staffing layer for drag shows.

import { supabase } from './supabase';
import { getSession } from './authStore';
import { sendNotification } from './notificationsStore';

// ─── Role types ───────────────────────────────────────────────────────────────

export const ROLE_TYPES = [
  { key: 'performer',     label: 'Performer',     emoji: '💃' },
  { key: 'mc',           label: 'MC / Host',      emoji: '🎤' },
  { key: 'dj',           label: 'DJ',             emoji: '🎧' },
  { key: 'door',         label: 'Door',           emoji: '🚪' },
  { key: 'tip_collector', label: 'Tip Collector', emoji: '💸' },
  { key: 'photographer', label: 'Photographer',   emoji: '📸' },
  { key: 'makeup_artist', label: 'Makeup Artist', emoji: '💄' },
  { key: 'other',        label: 'Other',          emoji: '✦'  },
] as const;

export type RoleKey = typeof ROLE_TYPES[number]['key'];

export function roleLabel(key: string): string {
  return ROLE_TYPES.find(r => r.key === key)?.label ?? key;
}

export function roleEmoji(key: string): string {
  return ROLE_TYPES.find(r => r.key === key)?.emoji ?? '✦';
}

// Suggested pay ranges per role (in dollars, for display only)
export const SUGGESTED_PAY: Record<string, { min: number; max: number }> = {
  performer:     { min: 75,  max: 300 },
  mc:            { min: 50,  max: 200 },
  dj:            { min: 100, max: 400 },
  door:          { min: 30,  max: 80  },
  tip_collector: { min: 25,  max: 60  },
  photographer:  { min: 80,  max: 250 },
  makeup_artist: { min: 60,  max: 200 },
  other:         { min: 0,   max: 0   },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventRole = {
  id: string;
  eventId: string;
  roleName: RoleKey;
  customName?: string;
  slots: number;
  payAmount: number;  // dollars
  filledCount?: number;
};

export type EventTalentInvite = {
  id: string;
  eventId: string;
  eventRoleId: string;
  roleName: RoleKey;
  customRoleName?: string;
  talentId?: string;
  stageName?: string;
  photoUrl?: string;
  status: 'invited' | 'accepted' | 'declined' | 'removed';
  payAgreed?: number;  // dollars
  phoneNumber?: string;
  invitedAt: string;
  respondedAt?: string;
};

// ─── Event Roles CRUD ─────────────────────────────────────────────────────────

export async function saveEventRoles(
  eventId: string,
  roles: Omit<EventRole, 'id' | 'eventId' | 'filledCount'>[],
): Promise<EventRole[]> {
  // Delete existing roles for this event and re-insert
  await supabase.from('event_roles').delete().eq('event_id', eventId);

  if (roles.length === 0) return [];

  const rows = roles.map(r => ({
    event_id:    eventId,
    role_name:   r.roleName,
    custom_name: r.customName ?? null,
    slots:       r.slots,
    pay_amount:  Math.round(r.payAmount * 100),  // store as cents
  }));

  const { data, error } = await supabase
    .from('event_roles')
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRole);
}

export async function loadEventRoles(eventId: string): Promise<EventRole[]> {
  const { data, error } = await supabase
    .from('event_roles')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at');

  if (error) throw new Error(error.message);

  const roles = (data ?? []).map(mapRole);

  // Attach filled counts
  for (const role of roles) {
    const { count } = await supabase
      .from('event_talent')
      .select('*', { count: 'exact', head: true })
      .eq('event_role_id', role.id)
      .eq('status', 'accepted');
    role.filledCount = count ?? 0;
  }

  return roles;
}

function mapRole(r: any): EventRole {
  return {
    id:          r.id,
    eventId:     r.event_id,
    roleName:    r.role_name,
    customName:  r.custom_name ?? undefined,
    slots:       r.slots,
    payAmount:   (r.pay_amount ?? 0) / 100,
    filledCount: 0,
  };
}

// ─── Talent Invites ───────────────────────────────────────────────────────────

export async function inviteTalentToRole(params: {
  eventId: string;
  eventRoleId: string;
  talentId: string;
  payAmount: number;  // dollars
  eventTitle: string;
  roleName: string;
}): Promise<EventTalentInvite> {
  const session = await getSession();

  const { data, error } = await supabase
    .from('event_talent')
    .insert({
      event_id:      params.eventId,
      event_role_id: params.eventRoleId,
      talent_id:     params.talentId,
      status:        'invited',
      pay_agreed:    null,
      invited_at:    new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Send in-app notification to the talent
  try {
    const { data: performer } = await supabase
      .from('performers')
      .select('user_id')
      .eq('id', params.talentId)
      .single();

    if (performer?.user_id) {
      await sendNotification({
        userId:   performer.user_id,
        type:     'event_invite',
        title:    'You\'ve been invited! 🎉',
        body:     `You\'ve been invited as ${roleLabel(params.roleName)} for "${params.eventTitle}" — $${params.payAmount}/show`,
        data:     { eventId: params.eventId, eventTalentId: data.id },
      });
    }
  } catch (_) {
    // Notification failure shouldn't block the invite
  }

  return mapInvite(data);
}

export async function respondToInvite(
  inviteId: string,
  accept: boolean,
  payAmount: number,
): Promise<void> {
  const { error } = await supabase
    .from('event_talent')
    .update({
      status:       accept ? 'accepted' : 'declined',
      pay_agreed:   accept ? Math.round(payAmount * 100) : null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', inviteId);

  if (error) throw new Error(error.message);
}

export async function loadEventTalent(eventId: string): Promise<EventTalentInvite[]> {
  const { data, error } = await supabase
    .from('event_talent')
    .select(`
      *,
      performers!event_talent_talent_id_fkey (stage_name, photo_url),
      event_roles!event_talent_event_role_id_fkey (role_name, custom_name)
    `)
    .eq('event_id', eventId)
    .order('created_at');

  if (error) throw new Error(error.message);

  return (data ?? []).map(row => ({
    id:              row.id,
    eventId:         row.event_id,
    eventRoleId:     row.event_role_id,
    roleName:        row.event_roles?.role_name ?? 'other',
    customRoleName:  row.event_roles?.custom_name ?? undefined,
    talentId:        row.talent_id ?? undefined,
    stageName:       row.performers?.stage_name ?? undefined,
    photoUrl:        row.performers?.photo_url ?? undefined,
    status:          row.status,
    payAgreed:       row.pay_agreed ? row.pay_agreed / 100 : undefined,
    phoneNumber:     row.phone_number ?? undefined,
    invitedAt:       row.invited_at,
    respondedAt:     row.responded_at ?? undefined,
  }));
}

export async function loadMyInvites(talentId: string): Promise<EventTalentInvite[]> {
  const { data, error } = await supabase
    .from('event_talent')
    .select(`
      *,
      event_roles!event_talent_event_role_id_fkey (role_name, custom_name)
    `)
    .eq('talent_id', talentId)
    .eq('status', 'invited')
    .order('invited_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(mapInvite);
}

function mapInvite(row: any): EventTalentInvite {
  return {
    id:             row.id,
    eventId:        row.event_id,
    eventRoleId:    row.event_role_id,
    roleName:       row.event_roles?.role_name ?? row.role_name ?? 'other',
    customRoleName: row.event_roles?.custom_name ?? undefined,
    talentId:       row.talent_id ?? undefined,
    status:         row.status,
    payAgreed:      row.pay_agreed ? row.pay_agreed / 100 : undefined,
    phoneNumber:    row.phone_number ?? undefined,
    invitedAt:      row.invited_at,
    respondedAt:    row.responded_at ?? undefined,
  };
}

// ─── Previous collaborators ───────────────────────────────────────────────────
// Returns talent who have previously worked a host's events (status = accepted).
// Used to auto-surface suggestions when creating a new event.

export async function loadPreviousCollaborators(hostUserId: string): Promise<string[]> {
  const { data: hostEvents } = await supabase
    .from('events')
    .select('id')
    .eq('host_id', hostUserId);

  if (!hostEvents?.length) return [];

  const eventIds = hostEvents.map(e => e.id);

  const { data } = await supabase
    .from('event_talent')
    .select('talent_id')
    .in('event_id', eventIds)
    .eq('status', 'accepted')
    .not('talent_id', 'is', null);

  const unique = [...new Set((data ?? []).map(r => r.talent_id).filter(Boolean))];
  return unique as string[];
}
