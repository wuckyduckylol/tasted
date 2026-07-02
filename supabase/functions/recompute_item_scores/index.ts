// Edge Function wrapper for on-demand community score recompute (SPEC Section 8).
// Deploy: supabase functions deploy recompute_item_scores
// The heavy lifting is the recompute_item_scores() SQL function; pg_cron covers
// the schedule, this endpoint covers manual/admin refreshes.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { error } = await supabase.rpc('recompute_item_scores');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
});
