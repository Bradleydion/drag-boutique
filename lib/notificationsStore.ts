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
  | 'event_updated'
  | 'event_invite';

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
 * Notify another user via the `send-notification` Edge Function.
 *
 * The Edge Function validates the caller's JWT, inserts the DB row using the
 * service-role key (so direct client inserts on the notifications table are
 * fully revoked), and fans out a device push notification.
 *
 * Non-fatal — a failure here never throws; it only logs a warning so the
 * calling flow (ticket purchase, booking request, etc.) is never blocked.
 */
export async function addNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: {
        user_id: params.userId,
        type:    params.type,
        title:   params.title,
        body:    params.body ?? undefined,
        link:    params.link ?? undefined,
      },
    });

    if (error) {
      console.warn('[notificationsStore] addNotification edge function error:', error.message);
    }
  } catch (e: any) {
    console.warn('[notificationsStore] addNotification exception:', e?.message);
  }
}
