import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type FormMessageProps = {
  message: string | null;
  tone?: 'error' | 'success';
};

/** Inline error or success message shown under a form. Renders nothing when empty. */
export function FormMessage({ message, tone = 'error' }: FormMessageProps) {
  const theme = useTheme();
  if (!message) return null;

  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[styles.text, { color: tone === 'error' ? theme.danger : theme.success }]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
