// supabase/functions/send-notification/index.ts
//
// Secure server-side notification dispatch.
// Called by the app whenever it needs to notify another user.
//
// Why this exists:
//   Inserting directly from the client (even with RLS) means any authenticated
//   user could craft a notification for any other user. This function validates
//   the caller's JWT, then uses the service-role key to insert — so the
//   notifications table INSERT policy for `authenticated` can be fully revoked.
//
// Deploy:
//   supabase functions deploy send-notification --project-ref vrlsphktnvxrbuwwuvpk
//
// Required secrets (set once via CLI):
//   supabase secrets set SUPABASE_URL=https://vrlsphktnvxrbuwwuvpk.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
//   (EXPO_ACCESS_TOKEN is optional — only needed if you use Expo push auth)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_TYPES = new Set([
  'ticket_sold',
  'booking_request',
  'booking_accepted',
  'booking_declined',
  'performer_tagged',
  'event_updated',
  'event_invite',
]);

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // ── 1. Verify caller is authenticated ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing authorization header' }, 401);
    }
    const callerJwt = authHeader.replace('Bearer ', '');

    // Use anon client just for JWT verification (no service-role needed here)
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(callerJwt);

    if (authError || !caller) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // ── 2. Parse and validate the payload ─────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'Invalid JSON body' }, 400);

    const { user_id, type, title, body: msgBody, link } = body as {
      user_id: string;
      type:    string;
      title:   string;
      body?:   string;
      link?:   string;
    };

    if (!user_id || typeof user_id !== 'string') {
      return json({ error: 'user_id is required' }, 400);
    }
    if (!type || !ALLOWED_TYPES.has(type)) {
      return json({ error: `type must be one of: ${[...ALLOWED_TYPES].join(', ')}` }, 400);
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return json({ error: 'title is required' }, 400);
    }
    if (title.length > 200) {
      return json({ error: 'title must be 200 characters or fewer' }, 400);
    }

    // ── 3. Insert using service-role key (bypasses RLS) ───────────────────────
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: insertError } = await adminClient
      .from('notifications')
      .insert({
        user_id,
        type,
        title:   title.trim(),
        body:    msgBody ?? null,
        link:    link    ?? null,
      });

    if (insertError) {
      console.error('[send-notification] insert error:', insertError.message);
      return json({ error: 'Failed to insert notification' }, 500);
    }

    // ── 4. Fan out Expo push notification to all user devices ─────────────────
    await dispatchPush(adminClient, { user_id, title: title.trim(), body: msgBody, link });

    return json({ ok: true });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[send-notification] unhandled error:', msg);
    return json({ error: msg }, 500);
  }
});

// ─── Push dispatch ────────────────────────────────────────────────────────────

async function dispatchPush(
  adminClient: ReturnType<typeof createClient>,
  params: { user_id: string; title: string; body?: string; link?: string },
) {
  try {
    // Fetch all push tokens registered to this user
    const { data: tokens, error } = await adminClient
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', params.user_id);

    if (error || !tokens?.length) return;

    // Build Expo push messages
    const messages = tokens.map(({ token }: { token: string }) => ({
      to:    token,
      title: params.title,
      body:  params.body ?? '',
      data:  params.link ? { link: params.link } : {},
      sound: 'default',
    }));

    // Send to Expo Push API
    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(messages),
    });

    if (!pushRes.ok) {
      console.warn('[send-notification] Expo push returned', pushRes.status);
    }
  } catch (e: unknown) {
    // Non-fatal — notification DB row already inserted; push is best-effort
    console.warn('[send-notification] push dispatch error:', e instanceof Error ? e.message : e);
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
