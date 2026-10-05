import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Files a content report (App Store Guideline 1.2) and emails the moderator.
//
// The app calls this instead of inserting into content_reports directly, so we
// can verify the caller, look up who posted the content (the client can't be
// trusted with that), rate-limit, and send the alert.
//
// Email goes out through Resend when the RESEND_API_KEY secret is set. Without
// it the report is still saved (notified_at stays null) and shows up in the
// Supabase table editor under content_reports.
//
// Optional secret: MODERATION_EMAIL (defaults to bradleydion@thebradleyproject.com).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_TYPES = new Set(['performer', 'event', 'listing', 'user']);
const REASONS: Record<string, string> = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or bullying',
  hate: 'Hate speech',
  sexual: 'Sexual content / nudity',
  violence: 'Violence or threats',
  impersonation: 'Pretending to be someone else',
  scam: 'Scam or fraud',
  other: 'Something else',
};
const MAX_REPORTS_PER_DAY = 20;

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Who posted it, and a human label, looked up server-side. */
async function lookupTarget(type: string, id: string): Promise<{ ownerId: string | null; label: string } | null> {
  if (type === 'performer') {
    const { data } = await admin.from('performers').select('user_id, stage_name').eq('id', id).maybeSingle();
    return data ? { ownerId: data.user_id ?? null, label: data.stage_name ?? 'Performer' } : null;
  }
  if (type === 'event') {
    if (!isUuid(id)) return null;
    const { data } = await admin.from('events').select('host_id, title').eq('id', id).maybeSingle();
    return data ? { ownerId: isUuid(data.host_id) ? data.host_id : null, label: data.title ?? 'Event' } : null;
  }
  if (type === 'listing') {
    if (!isUuid(id)) return null;
    const { data } = await admin.from('listings').select('seller_id, title').eq('id', id).maybeSingle();
    return data ? { ownerId: data.seller_id ?? null, label: data.title ?? 'Listing' } : null;
  }
  if (type === 'user') {
    if (!isUuid(id)) return null;
    const { data } = await admin.from('performers').select('stage_name').eq('user_id', id).limit(1).maybeSingle();
    return { ownerId: id, label: data?.stage_name ?? 'User account' };
  }
  return null;
}

async function emailModerator(report: Record<string, unknown>, reporterEmail: string | undefined): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return false;
  const to = Deno.env.get('MODERATION_EMAIL') ?? 'bradleydion@thebradleyproject.com';
  const reason = REASONS[String(report.reason)] ?? String(report.reason);
  const lines = [
    `New report on Sequins. Apple expects action within 24 hours.`,
    ``,
    `What: ${report.target_type} "${report.target_label}"`,
    `Reason: ${reason}`,
    report.details ? `Details: ${report.details}` : null,
    ``,
    `Target id: ${report.target_id}`,
    `Posted by account: ${report.target_owner_id ?? 'unknown / unclaimed listing'}`,
    `Reported by: ${reporterEmail ?? report.reporter_id}`,
    `Report id: ${report.id}`,
    ``,
    `To act: remove or edit the content in Supabase (or ask Claude), then set this report's status to "actioned" or "dismissed" in the content_reports table.`,
  ].filter((l) => l !== null).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Sequins Reports <noreply@thebradleyproject.com>',
      to: [to],
      subject: `[Sequins report] ${reason}: ${report.target_label}`,
      text: lines,
    }),
  });
  if (!res.ok) console.error('report-content: Resend error', res.status, await res.text());
  return res.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: auth } = await admin.auth.getUser(jwt);
    const user = auth?.user;
    if (!user) return json({ error: 'Please sign in to report content.' }, 401);

    const body = await req.json().catch(() => ({}));
    const targetType = String(body.targetType ?? '');
    const targetId = String(body.targetId ?? '').slice(0, 100);
    const reason = String(body.reason ?? '');
    const details = typeof body.details === 'string' ? body.details.trim().slice(0, 1000) : null;

    if (!TARGET_TYPES.has(targetType) || !targetId) return json({ error: 'Unknown content.' }, 400);
    if (!(reason in REASONS)) return json({ error: 'Pick a reason.' }, 400);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', user.id)
      .gte('created_at', since);
    if ((count ?? 0) >= MAX_REPORTS_PER_DAY) {
      return json({ error: "You've sent a lot of reports today. We'll review them; try again tomorrow." }, 429);
    }

    // Seed/demo content isn't in the database; still accept the report.
    const target = (await lookupTarget(targetType, targetId)) ?? {
      ownerId: null,
      label: typeof body.targetLabel === 'string' ? body.targetLabel.slice(0, 120) : targetId,
    };
    if (target.ownerId === user.id) return json({ error: "That's your own content." }, 400);

    const { data: report, error } = await admin
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        target_owner_id: target.ownerId,
        target_label: target.label,
        reason,
        details: details || null,
      })
      .select('*')
      .single();
    if (error || !report) throw error ?? new Error('Insert failed');

    let emailed = false;
    try {
      emailed = await emailModerator(report, user.email);
      if (emailed) {
        await admin.from('content_reports').update({ notified_at: new Date().toISOString() }).eq('id', report.id);
      }
    } catch (e) {
      console.error('report-content: email failed', e);
    }

    return json({ ok: true, reportId: report.id, ownerId: target.ownerId, emailed });
  } catch (err) {
    console.error('report-content error:', err);
    return json({ error: 'Could not send the report. Please try again.' }, 500);
  }
});
