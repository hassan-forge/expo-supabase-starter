import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/form-message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { signOut } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { profile, loading, error: loadError, updateProfile } = useProfile();
  // `null` means "not edited yet": the field shows the saved name until the user types.
  const [editedName, setEditedName] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState<'profile' | 'password' | 'signout' | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);

  const savedName = profile?.full_name ?? '';
  const fullName = editedName ?? savedName;

  async function saveProfile() {
    await updateProfile({ full_name: fullName.trim() });
    setEditedName(null);
  }

  async function run(kind: 'profile' | 'password' | 'signout', action: () => Promise<void>, success?: string) {
    setBusy(kind);
    setMessage(null);
    try {
      await action();
      if (success) setMessage({ text: success, tone: 'success' });
    } catch (e) {
      setMessage({ text: getErrorMessage(e), tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function changePassword() {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setNewPassword('');
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={styles.loader} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Profile</ThemedText>
        <ThemedText themeColor="textSecondary">Stored in the Supabase `profiles` table.</ThemedText>
      </View>

      <FormMessage message={loadError} />

      <TextField label="Full name" value={fullName} onChangeText={setEditedName} autoComplete="name" />
      <Button
        title="Save profile"
        loading={busy === 'profile'}
        disabled={busy !== null || fullName.trim() === savedName}
        onPress={() => run('profile', saveProfile, 'Profile saved.')}
      />

      <View style={styles.section}>
        <TextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Button
          title="Change password"
          variant="secondary"
          loading={busy === 'password'}
          disabled={busy !== null || newPassword.length < 6}
          onPress={() => run('password', changePassword, 'Password updated.')}
        />
      </View>

      <FormMessage message={message?.text ?? null} tone={message?.tone} />

      <View style={styles.footer}>
        <Button title="Sign out" variant="ghost" loading={busy === 'signout'} onPress={() => run('signout', signOut)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: Spacing.six,
  },
  header: {
    gap: Spacing.one,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  section: {
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  footer: {
    marginTop: 'auto',
  },
});
