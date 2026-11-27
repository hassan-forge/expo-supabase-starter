import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/form-message';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { getErrorMessage } from '@/lib/errors';
import { registerForPushNotifications, sendTestNotification } from '@/lib/notifications';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const { session } = useAuth();
  const { profile, reload } = useProfile();
  const [registering, setRegistering] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const pushEnabled = !!profile?.expo_push_token;

  async function enablePush() {
    if (!session) return;
    setRegistering(true);
    setMessage(null);
    try {
      const result = await registerForPushNotifications(session.user.id);
      if (result.status === 'registered') {
        setMessage({ text: 'Push notifications are on for this device.', tone: 'success' });
        await reload();
      } else if (result.status === 'denied') {
        setMessage({ text: 'Permission denied. You can enable notifications in Settings.', tone: 'error' });
      } else {
        setMessage({ text: result.reason, tone: 'error' });
      }
    } catch (e) {
      setMessage({ text: getErrorMessage(e), tone: 'error' });
    } finally {
      setRegistering(false);
    }
  }

  async function sendTest() {
    setSending(true);
    setMessage(null);
    try {
      await sendTestNotification();
      setMessage({ text: 'Test notification sent. It should arrive in a few seconds.', tone: 'success' });
    } catch (e) {
      setMessage({ text: getErrorMessage(e), tone: 'error' });
      // The function clears tokens Expo reports as dead, so refresh what we show.
      await reload();
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Hi, {firstName} 👋</ThemedText>
        <ThemedText themeColor="textSecondary">You are signed in with Supabase.</ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Account</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {session?.user.email}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Signed in with {session?.user.app_metadata.provider ?? 'email'}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Push notifications</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {pushEnabled
            ? 'This account has a device registered for push notifications.'
            : 'Register this device to receive push notifications from your backend.'}
        </ThemedText>
        <FormMessage message={message?.text ?? null} tone={message?.tone} />
        <Button
          title={pushEnabled ? 'Re-register this device' : 'Enable push notifications'}
          variant={pushEnabled ? 'secondary' : 'primary'}
          loading={registering}
          disabled={sending}
          onPress={enablePush}
        />
        {pushEnabled && (
          <Button
            title="Send a test notification"
            variant="ghost"
            loading={sending}
            disabled={registering}
            onPress={sendTest}
          />
        )}
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
