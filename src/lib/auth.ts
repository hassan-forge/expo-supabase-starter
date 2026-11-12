import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/** Deep link that Supabase redirects back to after OAuth (add it to Supabase > Auth > URL Configuration). */
export const authRedirectUrl = Linking.createURL('auth/callback');

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: authRedirectUrl,
    },
  });
  if (error) throw error;
  // When email confirmation is on, Supabase returns a user but no session yet.
  return { needsConfirmation: !data.session };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirectUrl,
  });
  if (error) throw error;
}

/** Google sign-in through Supabase OAuth, using the system browser and a PKCE code exchange. */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);
  if (result.type !== 'success') return; // user cancelled

  await exchangeCodeFromUrl(result.url);
}

/** Native Sign in with Apple (iOS). Uses a hashed nonce so the ID token can't be replayed. */
export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple only shares the user's name on the very first sign-in, so save it now.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');
  if (fullName) {
    await supabase.auth.updateUser({ data: { full_name: fullName } });
  }
}

// A redirect can reach the app twice (auth session result + deep link), but a code works only once.
const handledCodes = new Set<string>();

/** Completes an OAuth or email-link sign-in from a redirect URL that carries a `code`. */
export async function exchangeCodeFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const errorDescription = queryParams?.error_description;
  if (typeof errorDescription === 'string') throw new Error(errorDescription);

  const code = queryParams?.code;
  if (typeof code !== 'string' || handledCodes.has(code)) return;
  handledCodes.add(code);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
