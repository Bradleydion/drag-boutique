import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Contact relay: lets people reach each other on Sequins without in-app chat.
//
// The app sends { targetType, targetId, message }. This function works out who
// the recipient is server-side (the client is never trusted with that), checks
// the sender is allowed to contact them, and emails the note through Resend
// with Reply-To set to the sender's email. Replies go straight from inbox to
// inbox; Sequins never sees them.
//
// Target types:
//   listing       anyone signed in → the Shop seller
//   listing_buyer the seller → the person who bought that listing
//   event_host    anyone signed in → the event's host
//   event_talent  the event's host → a talent on that event's roster (event_talent id)
//
// Every send is logged in contact_messages (server-only table) for rate limits
// and abuse review. Blocks in either direction stop the send.
//
// Secrets: RESEND_API_KEY (required for delivery).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const MAX_PER_DAY = 20;
const MAX_LEN = 1000;
const TYPES = new Set(['listing', 'listing_buyer', 'event_host', 'event_talent']);

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

type Resolved = { recipientId: string; label: string; context: string } | { error: string; status: number };

async function resolve(type: string, id: string, senderId: string): Promise<Resolved> {
  if (!isUuid(id)) return { error: 'Not found.', status: 404 };

  if (type === 'listing' || type === 'listing_buyer') {
    const { data: l } = await admin.from('listings').select('seller_id, buyer_id, title').eq('id', id).maybeSingle();
    if (!l) return { error: 'That listing is gone.', status: 404 };
    if (type === 'listing') {
      if (!isUuid(l.seller_id)) return { error: "This seller can't be messaged yet.", status: 400 };
      return { recipientId: l.seller_id, label: l.title ?? 'your listing', context: `your Shop listing "${l.title}"` };
    }
    if (l.seller_id !== senderId) return { error: 'Only the seller can message the buyer.', status: 403 };
    if (!isUuid(l.buyer_id)) return { error: 'Nobody has bought this yet.', status: 400 };
    return { recipientId: l.buyer_id, label: l.title ?? 'your purchase', context: `your purchase "${l.title}"` };
  }

  if (type === 'event_host') {
    const { data: e } = await admin.from('events').select('host_id, title').eq('id', id).maybeSingle();
    if (!e) return { error: 'That show is gone.', status: 404 };
    if (!isUuid(e.host_id)) return { error: "This show's host isn't on Sequins yet.", status: 400 };
    return { recipientId: e.host_id, label: e.title ?? 'your show', context: `your show "${e.title}"` };
  }

  if (type === 'event_talent') {
    const { data: t } = await admin.from('event_talent').select('event_id, talent_id').eq('id', id).maybeSingle();
    if (!t) return { error: 'That invite is gone.', status: 404 };
    const { data: e } = await admin.from('events').select('host_id, title').eq('id', t.event_id).maybeSingle();
    if (!e || e.host_id !== senderId) return { error: "Only the show's host can message its lineup.", status: 403 };
    const { data: p } = await admin.from('performers').select('user_id').eq('id', t.talent_id).maybeSingle();
    if (!p || !isUuid(p.user_id)) return { error: "This person hasn't linked a Sequins account yet.", status: 400 };
    return { recipientId: p.user_id, label: e.title ?? 'a show', context: `"${e.title}", a show you're booked for` };
  }

  return { error: 'Unknown contact type.', status: 400 };
}

async function displayName(userId: string, meta: Record<string, unknown> | undefined): Promise<string> {
  const { data } = await admin.from('performers').select('stage_name').eq('user_id', userId).limit(1).maybeSingle();
  const name = data?.stage_name || (typeof meta?.display_name === 'string' ? meta.display_name : '');
  return String(name || 'A Sequins member').slice(0, 60);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: auth } = await admin.auth.getUser(jwt);
    const sender = auth?.user;
    if (!sender || !sender.email) return json({ error: 'Sign in to send a message.' }, 401);
    if (!sender.email_confirmed_at) return json({ error: 'Confirm your email first, then try again.' }, 403);

    const body = await req.json().catch(() => ({}));
    const targetType = String(body.targetType ?? '');
    const targetId = String(body.targetId ?? '');
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!TYPES.has(targetType)) return json({ error: 'Unknown contact type.' }, 400);
    if (message.length < 2) return json({ error: 'Write a message first.' }, 400);
    if (message.length > MAX_LEN) return json({ error: `Keep it under ${MAX_LEN} characters.` }, 400);

    const r = await resolve(targetType, targetId, sender.id);
    if ('error' in r) return json({ error: r.error }, r.status);
    if (r.recipientId === sender.id) return json({ error: "That's you!" }, 400);

    const { count: blocks } = await admin
      .from('user_blocks')
      .select('blocker_id', { count: 'exact', head: true })
      .or(`and(blocker_id.eq.${sender.id},blocked_id.eq.${r.recipientId}),and(blocker_id.eq.${r.recipientId},blocked_id.eq.${sender.id})`);
    if ((blocks ?? 0) > 0) return json({ error: "You can't message this account." }, 403);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: sent } = await admin
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', sender.id)
      .gte('created_at', since);
    if ((sent ?? 0) >= MAX_PER_DAY) return json({ error: "You've sent a lot of messages today. Try again tomorrow." }, 429);

    const { data: rec } = await admin.auth.admin.getUserById(r.recipientId);
    const to = rec?.user?.email;
    if (!to) return json({ error: "This person can't be reached right now." }, 400);

    const key = Deno.env.get('RESEND_API_KEY');
    if (!key) return json({ error: 'Messaging is down for a moment. Please try again later.' }, 503);

    const name = await displayName(sender.id, sender.user_metadata);
    const subject = `${name} sent you a message about ${r.label}`.slice(0, 140);
    const text = [
      `${name} sent you a message on Sequins about ${r.context}:`,
      '',
      message,
      '',
      '—',
      `Reply to this email to answer ${name} directly. Your reply goes to their email address, and they'll see yours.`,
      'Not OK? Report or block them in the Sequins app, or email bradleydion@thebradleyproject.com.',
    ].join('\n');
    const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1b1b2f;max-width:560px">
<p><strong>${esc(name)}</strong> sent you a message on Sequins about ${esc(r.context)}:</p>
<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #4fb3a5;background:#f4f7f7;white-space:pre-wrap">${esc(message)}</blockquote>
<p style="color:#555;font-size:13px">Reply to this email to answer ${esc(name)} directly. Your reply goes to their email address, and they'll see yours.<br>
Not OK? Report or block them in the Sequins app, or email bradleydion@thebradleyproject.com.</p></div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Sequins <noreply@thebradleyproject.com>',
        to: [to],
        reply_to: sender.email,
        subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error('contact-relay: Resend error', res.status, await res.text());
      return json({ error: "Couldn't send right now. Please try again in a minute." }, 502);
    }

    await admin.from('contact_messages').insert({
      sender_id: sender.id,
      recipient_id: r.recipientId,
      target_type: targetType,
      target_id: targetId,
      body: message,
    });

    // In-app heads-up for the recipient (best effort).
    try {
      await admin.from('notifications').insert({
        user_id: r.recipientId,
        type: 'contact_message',
        title: `New message from ${name}`,
        body: `About ${r.label}. Check your email to read and reply.`,
        link: null,
      });
    } catch { /* ignore */ }

    return json({ ok: true });
  } catch (err) {
    console.error('contact-relay error:', err);
    return json({ error: "Couldn't send right now. Please try again." }, 500);
  }
});
