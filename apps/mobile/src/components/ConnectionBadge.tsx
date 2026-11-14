import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { ConnectionStatus } from '../lib/supabase-client';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

export function ConnectionBadge({ status }: ConnectionBadgeProps) {
  let badgeText = 'Disconnected';
  let badgeColor = colors.textMuted;
  let dotColor = colors.textDisabled;

  switch (status) {
    case 'connected':
      badgeText = 'Connected';
      badgeColor = colors.success;
      dotColor = colors.success;
      break;
    case 'connecting':
    case 'reconnecting':
      badgeText = status === 'connecting' ? 'Connecting...' : 'Reconnecting...';
      badgeColor = colors.warning;
      dotColor = colors.warning;
      break;
    case 'waiting_approval':
      badgeText = 'Waiting Approval';
      badgeColor = colors.accent;
      dotColor = colors.accent;
      break;
    case 'connection_lost':
      badgeText = 'Connection Lost';
      badgeColor = colors.danger;
      dotColor = colors.danger;
      break;
    case 'revoked':
      badgeText = 'Revoked by Host';
      badgeColor = colors.danger;
      dotColor = colors.danger;
      break;
  }

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: badgeColor }]}>{badgeText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
