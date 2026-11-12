import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/form-message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { signUpWithEmail } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit = fullName.trim().length > 1 && email.length > 3 && password.length >= 6;

  async function handleSignUp() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const { needsConfirmation } = await signUpWithEmail(email, password, fullName);
      if (needsConfirmation) {
        setNotice('Check your inbox and tap the link to confirm your email, then sign in.');
      }
      // Without email confirmation the user is signed in straight away and the
      // router guard moves them to the app.
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Create your account</ThemedText>
        <ThemedText themeColor="textSecondary">It takes less than a minute.</ThemedText>
      </View>

      <TextField
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Jane Doe"
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <FormMessage message={error} />
      <FormMessage message={notice} tone="success" />

      <Button title="Create account" loading={loading} disabled={!canSubmit || loading} onPress={handleSignUp} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
});
