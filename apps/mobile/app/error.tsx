import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw, KeyRound, WifiOff, HelpCircle } from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { GlassCard } from '../src/components/GlassCard';
import { GlowButton } from '../src/components/GlowButton';
import { Header } from '../src/components/Header';
import { mobileSupabase } from '../src/lib/supabase-client';
import { secureStorage } from '../src/lib/secure-store';
import { triggerHaptic } from '../src/lib/haptics';

export default function ErrorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reason = (params.reason as string) || 'Presentation connection was interrupted.';

  const [isReconnecting, setIsReconnecting] = useState(false);

  async function handleReconnect() {
    setIsReconnecting(true);
    await triggerHaptic('medium');

    const sessionId = await secureStorage.getSessionId();
    const deviceToken = await secureStorage.getDeviceToken();

    if (sessionId && deviceToken) {
      try {
        await mobileSupabase.connectRealtime(sessionId, deviceToken);
        await triggerHaptic('success');
        router.replace('/connected');
        return;
      } catch {
        // Fall through
      }
    }

    setIsReconnecting(false);
    await triggerHaptic('error');
  }

  async function handleNewPair() {
    await triggerHaptic('selection');
    await secureStorage.clearSession();
    router.replace('/pair');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Connection Status" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.warningCircle}>
            <WifiOff size={44} color={colors.danger} />
          </View>
          <Text style={styles.title}>Connection Interrupted</Text>
          <Text style={styles.subtitle}>{reason}</Text>
        </View>

        <GlassCard style={styles.card} glow>
          <View style={styles.cardHeader}>
            <AlertTriangle size={18} color={colors.warning} />
            <Text style={styles.cardTitle}>Why did this happen?</Text>
          </View>
          <Text style={styles.cardText}>
            • The 3-minute single-use pairing code may have expired.{'\n'}
            • The desktop presenter may have declined or revoked access.{'\n'}
            • Cellular or Wi-Fi network connectivity was momentarily lost.{'\n'}
            • The presentation session on the laptop was closed.
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <HelpCircle size={18} color={colors.info} />
            <Text style={styles.cardTitle}>Troubleshooting Tips</Text>
          </View>
          <Text style={styles.cardText}>
            1. Check your internet connection (Wi-Fi or 4G/5G mobile data).{'\n'}
            2. Request a fresh 6-digit pair code from the presenter's screen.{'\n'}
            3. Enter the new code and ensure the presenter clicks "Approve".
          </Text>
        </GlassCard>

        <View style={styles.actions}>
          <GlowButton
            title="Try Reconnecting"
            onPress={handleReconnect}
            loading={isReconnecting}
            size="lg"
            icon={<RefreshCw size={18} color="#fff" />}
          />

          <GlowButton
            title="Pair with New 6-Digit Code"
            onPress={handleNewPair}
            variant="secondary"
            size="md"
            icon={<KeyRound size={18} color={colors.textSecondary} />}
          />
        </View>
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
    padding: 24,
    gap: 16,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    marginVertical: 10,
  },
  warningCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginTop: 10,
  },
});
