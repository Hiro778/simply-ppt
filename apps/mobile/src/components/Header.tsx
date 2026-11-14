import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, ChevronLeft, LayoutGrid } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { ConnectionBadge } from './ConnectionBadge';
import { ConnectionStatus } from '../lib/supabase-client';
import { triggerHaptic } from '../lib/haptics';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showModesButton?: boolean;
  connectionStatus?: ConnectionStatus;
  rightAction?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  showModesButton = false,
  connectionStatus,
  rightAction,
}: HeaderProps) {
  const router = useRouter();

  async function handleBack() {
    await triggerHaptic('selection');
    router.back();
  }

  async function handleModes() {
    await triggerHaptic('selection');
    router.push('/mode-select' as any);
  }

  async function handleSettings() {
    await triggerHaptic('selection');
    router.push('/settings' as any);
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : showModesButton ? (
          <TouchableOpacity onPress={handleModes} style={styles.iconButton}>
            <LayoutGrid size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {connectionStatus ? <ConnectionBadge status={connectionStatus} /> : null}
        {rightAction ? (
          rightAction
        ) : (
          <TouchableOpacity onPress={handleSettings} style={styles.iconButton}>
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(9, 9, 11, 0.95)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
