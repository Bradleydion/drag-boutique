import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Cron schedule: runs every day at 06:00 UTC
// Set in Supabase Dashboard → Edge Functions → keep-alive → Schedule

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Lightweight ping — just touch the DB so the project stays active
  const { error } = await supabase.from('events').select('id').limit(1);

  if (error) {
    console.error('[keep-alive] DB ping failed:', error.message);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const ts = new Date().toISOString();
  console.log(`[keep-alive] DB pinged successfully at ${ts}`);
  return new Response(
    JSON.stringify({ ok: true, pingedAt: ts }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
