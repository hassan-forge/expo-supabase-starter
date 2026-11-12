import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { exchangeCodeFromUrl } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  /** True until the stored session has been read on startup. */
  isLoading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider />');
  }
  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setIsLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Finish email-confirmation and password-reset links that open the app.
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (url?.includes('code=')) {
      exchangeCodeFromUrl(url).catch((error) => console.warn('Auth link failed:', error));
    }
  }, [url]);

  return <AuthContext value={{ session, isLoading }}>{children}</AuthContext>;
}
