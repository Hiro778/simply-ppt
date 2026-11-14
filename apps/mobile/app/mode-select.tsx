import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Play,
  PenTool,
  Radio,
  Mic,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { GlassCard } from '../src/components/GlassCard';
import { Header } from '../src/components/Header';
import { mobileSupabase, ConnectionStatus } from '../src/lib/supabase-client';
import { triggerHaptic } from '../src/lib/haptics';

export default function ModeSelectScreen() {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');

  useEffect(() => {
    const unsub = mobileSupabase.onStatusChange((s) => {
      setConnectionStatus(s);
      if (s === 'revoked' || s === 'connection_lost') {
        router.replace({
          pathname: '/error',
          params: { reason: s === 'revoked' ? 'Host revoked access.' : 'Connection lost.' },
        });
      }
    });
    return unsub;
  }, []);

  const modes = [
    {
      id: 'remote',
      title: 'Remote Mode',
      subtitle: 'One-handed presentation clicker',
      description: 'Large Next & Previous touch buttons, direct slide jump drawer, and presentation timer.',
      icon: <Play size={24} color="#8b5cf6" />,
      accentColor: '#8b5cf6',
      route: '/modes/remote',
    },
    {
      id: 'annotation',
      title: 'Annotation Mode',
      subtitle: 'Stylus & freehand live drawing',
      description: 'Draw pen vectors and highlights directly over your slides with adjustable colors and undo.',
      icon: <PenTool size={24} color="#e11d48" />,
      accentColor: '#e11d48',
      route: '/modes/annotation',
    },
    {
      id: 'presenter',
      title: 'Presenter Mode',
      subtitle: 'Laser pointer, previews & zoom',
      description: 'Virtual laser tracking surface, current/next slide cards, and regional canvas magnification.',
      icon: <Radio size={24} color="#3b82f6" />,
      accentColor: '#3b82f6',
      route: '/modes/presenter',
    },
    {
      id: 'speak_only',
      title: 'Speak Only Mode',
      subtitle: '3 Indonesian voice commands',
      description: 'Hands-free voice triggers: "Lanjut slide", "Slide sebelumnya", and "Slide [number]".',
      icon: <Mic size={24} color="#10b981" />,
      accentColor: '#10b981',
      route: '/modes/speak-only',
    },
  ];

  async function handleSelect(route: string) {
    await triggerHaptic('medium');
    router.push(route as any);
  }

  async function handleDisconnect() {
    await triggerHaptic('warning');
    await mobileSupabase.disconnect();
    router.replace('/welcome');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Select Mode"
        subtitle="Active Presentation"
        connectionStatus={connectionStatus}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.intro}>
          <Text style={styles.title}>Operating Modes</Text>
          <Text style={styles.subtitle}>
            Choose how you want to interact with the slides. You can switch modes at any time.
          </Text>
        </View>

        <View style={styles.grid}>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.8}
              onPress={() => handleSelect(m.route)}
            >
              <GlassCard style={styles.modeCard}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${m.accentColor}20`, borderColor: `${m.accentColor}50` },
                    ]}
                  >
                    {m.icon}
                  </View>
                  <View style={styles.cardTitles}>
                    <Text style={styles.modeTitle}>{m.title}</Text>
                    <Text style={styles.modeSubtitle}>{m.subtitle}</Text>
                  </View>
                  <ChevronRight size={20} color={colors.textMuted} />
                </View>

                <Text style={styles.modeDescription}>{m.description}</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleDisconnect}
          activeOpacity={0.7}
          style={styles.disconnectButton}
        >
          <LogOut size={16} color={colors.danger} />
          <Text style={styles.disconnectText}>Disconnect Device Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    gap: 16,
  },
  intro: {
    marginTop: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  grid: {
    gap: 14,
  },
  modeCard: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTitles: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  modeSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  modeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
});
