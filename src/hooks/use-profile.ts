import { useCallback, useEffect, useState } from 'react';

import type { Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

/** Loads and updates the signed-in user's row in the `profiles` table. */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) return null;
    return supabase.from('profiles').select('*').eq('id', userId).single();
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    fetchProfile().then((result) => {
      if (cancelled || !result) return;
      setProfile(result.data);
      setError(result.error?.message ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const reload = useCallback(async () => {
    const result = await fetchProfile();
    if (!result) return;
    setProfile(result.data);
    setError(result.error?.message ?? null);
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (changes: { full_name?: string | null; avatar_url?: string | null }) => {
      if (!userId) return;
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();
      if (updateError) throw updateError;
      setProfile(data);
    },
    [userId],
  );

  return { profile, loading, error, reload, updateProfile };
}
