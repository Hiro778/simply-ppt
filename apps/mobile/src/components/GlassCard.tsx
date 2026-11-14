import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  glow?: boolean;
}

export function GlassCard({ children, style, borderColor, glow }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        borderColor ? { borderColor } : null,
        glow ? styles.glow : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    borderColor: colors.surfaceBorderAccent,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
});
