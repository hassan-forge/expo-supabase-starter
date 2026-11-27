/**
 * Pure logic for the send-push function: input validation, the Expo push
 * request and the receipt handling. No Deno or Supabase APIs here, so it is
 * unit-tested directly (see push_test.ts).
 */

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export const MAX_TITLE = 100;
export const MAX_BODY = 500;

export interface PushInput {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data?: Record<string, unknown>;
}

export type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

export class InputError extends Error {}

export function parseInput(raw: unknown): PushInput {
  if (typeof raw !== 'object' || raw === null) {
    throw new InputError('Body must be a JSON object with "title" and "body".');
  }
  const { title, body, data } = raw as Record<string, unknown>;
  if (typeof title !== 'string' || !title.trim()) throw new InputError('"title" is required.');
  if (typeof body !== 'string' || !body.trim()) throw new InputError('"body" is required.');
  if (title.length > MAX_TITLE) throw new InputError(`"title" must be at most ${MAX_TITLE} characters.`);
  if (body.length > MAX_BODY) throw new InputError(`"body" must be at most ${MAX_BODY} characters.`);
  if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
    throw new InputError('"data" must be an object.');
  }
  return { title: title.trim(), body: body.trim(), data: data as Record<string, unknown> | undefined };
}

export function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

export function buildMessage(token: string, input: PushInput): ExpoMessage {
  const message: ExpoMessage = { to: token, title: input.title, body: input.body, sound: 'default' };
  if (input.data) message.data = input.data;
  return message;
}

/** A token Expo says is no longer valid should be removed from the profile. */
export function isDeadToken(ticket: ExpoTicket): boolean {
  return ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered';
}

export async function sendExpoPush(
  message: ExpoMessage,
  options: { accessToken?: string; fetch?: typeof fetch } = {},
): Promise<ExpoTicket> {
  const doFetch = options.fetch ?? fetch;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  // Only needed if "enhanced push security" is turned on for the Expo project.
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  const response = await doFetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    throw new Error(`Expo push service returned ${response.status}`);
  }
  const payload = (await response.json()) as { data?: ExpoTicket; errors?: { message: string }[] };
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join('; '));
  }
  if (!payload.data) throw new Error('Expo push service returned no ticket');
  return payload.data;
}
