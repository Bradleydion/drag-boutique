import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { user_id, title, body, data } = await req.json() as {
      user_id: string;
      title: string;
      body?: string;
      data?: Record<string, string>;
    };

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'user_id and title are required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all push tokens for this user using the service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokenRows, error: tokErr } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (tokErr) throw new Error('Token lookup failed: ' + tokErr.message);
    if (!tokenRows || tokenRows.length === 0) {
      // User has no push tokens registered — not an error, just a no-op
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Build Expo push messages
    const messages = tokenRows.map(({ token }) => ({
      to: token,
      title,
      body: body ?? '',
      data: data ?? {},
      sound: 'default',
      priority: 'high',
    }));

    // Send to Expo Push API
    const expoPushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    if (!expoPushRes.ok) {
      const errText = await expoPushRes.text();
      throw new Error('Expo push API error: ' + errText);
    }

    const expoResult = await expoPushRes.json();

    // Clean up any invalid/expired tokens reported by Expo
    const toRemove: string[] = [];
    const results: Array<{ status: string; message?: string; details?: { error?: string } }> =
      Array.isArray(expoResult.data) ? expoResult.data : [];

    results.forEach((r, i) => {
      if (
        r.status === 'error' &&
        (r.details?.error === 'DeviceNotRegistered' || r.message === 'DeviceNotRegistered')
      ) {
        toRemove.push(tokenRows[i].token);
      }
    });

    if (toRemove.length > 0) {
      await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', user_id)
        .in('token', toRemove);
    }

    return new Response(
      JSON.stringify({ sent: messages.length - toRemove.length, removed: toRemove.length }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
