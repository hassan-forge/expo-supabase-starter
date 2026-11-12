import * as AppleAuthentication from 'expo-apple-authentication';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/form-message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { signInWithApple, signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';

export default function SignInScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  async function run(kind: 'email' | 'google', action: () => Promise<void>) {
    setError(null);
    setPending(kind);
    try {
      await action();
      // On success the auth listener updates the session and the router guard
      // swaps to the signed-in screens automatically.
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setPending(null);
    }
  }

  async function handleApple() {
    setError(null);
    try {
      await signInWithApple();
    } catch (e) {
      // ERR_REQUEST_CANCELED means the user closed the Apple sheet.
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setError(getErrorMessage(e));
      }
    }
  }

  const canSubmit = email.length > 3 && password.length >= 6;

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Welcome back</ThemedText>
        <ThemedText themeColor="textSecondary">Sign in to continue.</ThemedText>
      </View>

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
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => canSubmit && run('email', () => signInWithEmail(email, password))}
      />

      <Link href="/forgot-password" style={[styles.link, { color: theme.textSecondary }]}>
        Forgot password?
      </Link>

      <FormMessage message={error} />

      <Button
        title="Sign in"
        loading={pending === 'email'}
        disabled={!canSubmit || pending !== null}
        onPress={() => run('email', () => signInWithEmail(email, password))}
      />

      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
        <ThemedText type="small" themeColor="textSecondary">
          or
        </ThemedText>
        <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
      </View>

      <Button
        title="Continue with Google"
        variant="secondary"
        loading={pending === 'google'}
        disabled={pending !== null}
        onPress={() => run('google', signInWithGoogle)}
      />

      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            colorScheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={14}
          style={styles.appleButton}
          onPress={handleApple}
        />
      )}

      <View style={styles.footer}>
        <ThemedText themeColor="textSecondary">New here?</ThemedText>
        <Link href="/sign-up" style={[styles.link, { color: theme.tint }]}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.five,
    marginBottom: Spacing.two,
  },
  link: {
    fontSize: 14,
    fontWeight: 600,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 'auto',
  },
});
