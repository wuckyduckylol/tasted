// Delivers queued notifications via Expo push (SPEC Section 8/10).
// Deploy: supabase functions deploy send_push
// Invoke on a schedule or after inserting rows into `notifications`.
import { createClient } from 'npm:@supabase/supabase-js@2';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Unread, undelivered notifications joined to their owners' push tokens.
  const { data: pending, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, payload, push_tokens:user_id(expo_push_token)')
    .eq('read', false)
    .limit(100);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const { data: tokens, error: tokenError } = await supabase
    .from('push_tokens')
    .select('user_id, expo_push_token');
  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
  }
  const tokensByUser = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t.expo_push_token);
    tokensByUser.set(t.user_id, list);
  }

  const messages: PushMessage[] = [];
  for (const n of pending ?? []) {
    const payload = (n.payload ?? {}) as { title?: string; body?: string };
    for (const to of tokensByUser.get(n.user_id) ?? []) {
      messages.push({
        to,
        title: payload.title ?? 'Tasted',
        body: payload.body ?? 'Something new for you.',
        data: { type: n.type, notificationId: n.id },
      });
    }
  }

  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (res.ok) sent += chunk.length;
  }

  return new Response(JSON.stringify({ ok: true, pending: pending?.length ?? 0, sent }), {
    headers: { 'content-type': 'application/json' },
  });
});
