// lib/notificationsStore.ts
import { supabase } from './supabase';
import { getSession } from './authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'ticket_sold'
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_declined'
  | 'performer_tagged'
  | 'event_updated';

export type NotificationRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  readAt?: string;
  createdAt: string;
};

// ─── Local cache ─────────────────────────────────────────────────────────────

let _notifications: NotificationRecord[] = [];

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToNotification(row: Record<string, any>): NotificationRecord {
  return {
    id:        row.id,
    userId:    row.user_id,
    type:      row.type as NotificationType,
    title:     row.title,
    body:      row.body ?? undefined,
    link:      row.link ?? undefined,
    readAt:    row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load the current user's notifications (most recent 50) into cache. */
export async function loadNotifications(): Promise<void> {
  const session = getSession();
  if (!session?.user) return;

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[notificationsStore] load error:', error.message);
    return;
  }
  _notifications = (data ?? []).map(rowToNotification);
}

/** Return the cached notification list. */
export function getNotifications(): NotificationRecord[] {
  return _notifications;
}

/** Return the number of unread notifications. */
export function getUnreadCount(): number {
  return _notifications.filter(n => !n.readAt).length;
}

/** Mark a single notification as read. */
export async function markRead(id: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('id', id);

  if (error) {
    console.warn('[notificationsStore] markRead error:', error.message);
    return;
  }
  _notifications = _notifications.map(n =>
    n.id === id ? { ...n, readAt: now } : n,
  );
}

/** Mark all notifications as read for the current user. */
export async function markAllRead(): Promise<void> {
  const session = getSession();
  if (!session?.user) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('user_id', session.user.id)
    .is('read_at', null);

  if (error) {
    console.warn('[notificationsStore] markAllRead error:', error.message);
    return;
  }
  _notifications = _notifications.map(n => ({ ...n, readAt: n.readAt ?? now }));
}

/**
 * Insert a notification for another user.
 * Call this from within flows (ticket purchase, booking request, etc.)
 * after any action that should notify someone.
 */
export async function addNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type:    params.type,
    title:   params.title,
    body:    params.body ?? null,
    link:    params.link ?? null,
  });

  if (error) {
    // Non-fatal — notification failure shouldn't break the main flow
    console.warn('[notificationsStore] addNotification error:', error.message);
  }
}
