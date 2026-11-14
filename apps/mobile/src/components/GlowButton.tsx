import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { triggerHaptic } from '../lib/haptics';

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'giant';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GlowButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
}: GlowButtonProps) {
  async function handlePress() {
    if (disabled || loading) return;
    await triggerHaptic('medium');
    onPress();
  }

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        styles[size],
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        isGhost && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          {title ? (
            <Text
              style={[
                styles.text,
                styles[`text_${size}` as keyof typeof styles],
                isGhost && { color: colors.textSecondary },
                disabled && { color: colors.textDisabled },
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 18,
  },
  giant: {
    paddingVertical: 26,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDark,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  secondary: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.surfaceBorder,
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 15,
  },
  text_lg: {
    fontSize: 17,
  },
  text_giant: {
    fontSize: 20,
    fontWeight: '700',
  },
});
