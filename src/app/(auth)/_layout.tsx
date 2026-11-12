import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create account', headerBackTitle: 'Back' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
