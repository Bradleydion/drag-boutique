// components/PrimaryButton.tsx
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../src/theme/colors';

type Variant = 'primary' | 'danger' | 'ghost';

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
}) {
  const bg =
    variant === 'danger' ? colors.danger :
    variant === 'ghost'  ? 'transparent' :
    colors.primary;

  const textColor =
    variant === 'ghost' ? colors.primary : colors.offWhite;

  const borderStyle =
    variant === 'ghost'
      ? { borderWidth: 2, borderColor: colors.primary }
      : {};

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        borderStyle,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.88 },
      ]}
    >
      <View style={styles.inner}>
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});