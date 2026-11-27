import { deepStrictEqual as assertEquals, rejects, throws } from 'node:assert/strict';

import {
  buildMessage,
  EXPO_PUSH_URL,
  InputError,
  isDeadToken,
  isExpoPushToken,
  MAX_TITLE,
  parseInput,
  sendExpoPush,
} from './push.ts';

const TOKEN = 'ExponentPushToken[abc123]';

function fakeFetch(status: number, body: unknown, seen: { url?: string; init?: RequestInit } = {}) {
  return ((url: string, init?: RequestInit) => {
    seen.url = url;
    seen.init = init;
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  }) as typeof fetch;
}

Deno.test('parseInput trims and accepts optional data', () => {
  assertEquals(parseInput({ title: ' Hi ', body: ' There ', data: { screen: 'profile' } }), {
    title: 'Hi',
    body: 'There',
    data: { screen: 'profile' },
  });
});

Deno.test('parseInput rejects missing, empty, oversized and malformed fields', () => {
  throws(() => parseInput(null), InputError);
  throws(() => parseInput({ body: 'x' }), /"title" is required/);
  throws(() => parseInput({ title: '  ', body: 'x' }), InputError);
  throws(() => parseInput({ title: 'x'.repeat(MAX_TITLE + 1), body: 'x' }), InputError);
  throws(() => parseInput({ title: 'x', body: 'y', data: [1] }), /"data"/);
});

Deno.test('isExpoPushToken accepts both Expo token formats only', () => {
  assertEquals(isExpoPushToken(TOKEN), true);
  assertEquals(isExpoPushToken('ExpoPushToken[xyz]'), true);
  assertEquals(isExpoPushToken('fcm-device-token'), false);
});

Deno.test('buildMessage leaves out data when there is none', () => {
  assertEquals(buildMessage(TOKEN, { title: 'a', body: 'b' }), {
    to: TOKEN,
    title: 'a',
    body: 'b',
    sound: 'default',
  });
});

Deno.test('sendExpoPush posts the message and returns the ticket', async () => {
  const seen: { url?: string; init?: RequestInit } = {};
  const ticket = await sendExpoPush(buildMessage(TOKEN, { title: 'a', body: 'b' }), {
    accessToken: 'secret',
    fetch: fakeFetch(200, { data: { status: 'ok', id: 'ticket-1' } }, seen),
  });
  assertEquals(ticket, { status: 'ok', id: 'ticket-1' });
  assertEquals(seen.url, EXPO_PUSH_URL);
  assertEquals((seen.init?.headers as Record<string, string>).Authorization, 'Bearer secret');
  assertEquals(JSON.parse(seen.init?.body as string).to, TOKEN);
});

Deno.test('sendExpoPush sends no Authorization header without an access token', async () => {
  const seen: { url?: string; init?: RequestInit } = {};
  await sendExpoPush(buildMessage(TOKEN, { title: 'a', body: 'b' }), {
    fetch: fakeFetch(200, { data: { status: 'ok', id: 't' } }, seen),
  });
  assertEquals('Authorization' in (seen.init?.headers as Record<string, string>), false);
});

Deno.test('a DeviceNotRegistered ticket marks the token as dead', async () => {
  const ticket = await sendExpoPush(buildMessage(TOKEN, { title: 'a', body: 'b' }), {
    fetch: fakeFetch(200, {
      data: { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
    }),
  });
  assertEquals(isDeadToken(ticket), true);
  assertEquals(isDeadToken({ status: 'error', message: 'rate limited' }), false);
});

Deno.test('sendExpoPush surfaces HTTP and request-level errors', async () => {
  const msg = buildMessage(TOKEN, { title: 'a', body: 'b' });
  await rejects(() => sendExpoPush(msg, { fetch: fakeFetch(503, {}) }), /503/);
  await rejects(
    () => sendExpoPush(msg, { fetch: fakeFetch(200, { errors: [{ message: 'bad request' }] }) }),
    /bad request/,
  );
});
