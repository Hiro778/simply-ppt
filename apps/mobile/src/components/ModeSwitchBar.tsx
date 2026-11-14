import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, PenTool, Radio, Mic } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { triggerHaptic } from '../lib/haptics';
import { MobileMode } from '../lib/protocol';

interface ModeSwitchBarProps {
  currentMode: MobileMode;
}

export function ModeSwitchBar({ currentMode }: ModeSwitchBarProps) {
  const router = useRouter();

  const modes: Array<{
    key: MobileMode;
    label: string;
    route: string;
    icon: (color: string) => React.ReactNode;
  }> = [
    {
      key: 'remote',
      label: 'Remote',
      route: '/modes/remote',
      icon: (c) => <Play size={16} color={c} />,
    },
    {
      key: 'annotation',
      label: 'Annotate',
      route: '/modes/annotation',
      icon: (c) => <PenTool size={16} color={c} />,
    },
    {
      key: 'presenter',
      label: 'Presenter',
      route: '/modes/presenter',
      icon: (c) => <Radio size={16} color={c} />,
    },
    {
      key: 'speak_only',
      label: 'Speak Only',
      route: '/modes/speak-only',
      icon: (c) => <Mic size={16} color={c} />,
    },
  ];

  async function handleSelect(route: string, key: MobileMode) {
    if (key === currentMode) return;
    await triggerHaptic('selection');
    router.replace(route as any);
  }

  return (
    <View style={styles.container}>
      {modes.map((item) => {
        const isActive = item.key === currentMode;
        const iconColor = isActive ? colors.textPrimary : colors.textMuted;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.7}
            onPress={() => handleSelect(item.route, item.key)}
            style={[styles.item, isActive && styles.itemActive]}
          >
            {item.icon(iconColor)}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 18, 28, 0.9)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    gap: 6,
  },
  itemActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
