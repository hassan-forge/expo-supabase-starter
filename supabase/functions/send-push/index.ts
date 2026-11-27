// Supabase Edge Function: send a push notification to the signed-in user's device.
//
// The app calls it with supabase.functions.invoke('send-push', { body: { title, body } }).
// The user's own JWT is forwarded to the database, so row level security decides
// which profile can be read: a user can only ever notify their own device.

import { createClient } from '@supabase/supabase-js';

import {
  buildMessage,
  InputError,
  isDeadToken,
  isExpoPushToken,
  parseInput,
  sendExpoPush,
} from './push.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Missing Authorization header' }, 401);

  // A client scoped to the caller: every query runs with their permissions.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Not signed in' }, 401);

  let input;
  try {
    input = parseInput(await req.json());
  } catch (err) {
    const message = err instanceof InputError ? err.message : 'Body must be valid JSON.';
    return json({ error: message }, 400);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', user.id)
    .single();
  if (profileError) return json({ error: profileError.message }, 500);

  const token = profile?.expo_push_token;
  if (!token) return json({ error: 'No device registered for push notifications.' }, 409);
  if (!isExpoPushToken(token)) return json({ error: 'Saved push token is not a valid Expo token.' }, 409);

  try {
    const ticket = await sendExpoPush(buildMessage(token, input), {
      accessToken: Deno.env.get('EXPO_ACCESS_TOKEN'),
    });

    if (isDeadToken(ticket)) {
      // The app was uninstalled or notifications were turned off: forget the token.
      await supabase
        .from('profiles')
        .update({ expo_push_token: null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      return json({ error: 'This device is no longer registered. Enable notifications again.' }, 410);
    }
    if (ticket.status === 'error') return json({ error: ticket.message }, 502);

    return json({ ticketId: ticket.id });
  } catch (err) {
    console.error('send-push failed', err);
    return json({ error: 'Could not reach the Expo push service.' }, 502);
  }
});
