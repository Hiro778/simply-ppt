import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, ShieldCheck, ArrowRight, LayoutGrid } from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { GlassCard } from '../src/components/GlassCard';
import { GlowButton } from '../src/components/GlowButton';
import { Header } from '../src/components/Header';
import { triggerHaptic } from '../src/lib/haptics';

export default function ConnectedScreen() {
  const router = useRouter();

  useEffect(() => {
    triggerHaptic('success');
  }, []);

  async function handleSelectMode() {
    await triggerHaptic('medium');
    router.replace('/mode-select');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Device Paired" />

      <View style={styles.container}>
        <View style={styles.heroSection}>
          <View style={styles.successCircle}>
            <CheckCircle2 size={54} color={colors.success} />
          </View>

          <Text style={styles.title}>Controller Authorized</Text>
          <Text style={styles.subtitle}>
            Your device is cryptographically authenticated with the presentation host.
          </Text>
        </View>

        <GlassCard style={styles.infoCard} glow>
          <View style={styles.infoRow}>
            <ShieldCheck size={20} color={colors.accent} />
            <Text style={styles.infoTitle}>Session Handshake Complete</Text>
          </View>
          <Text style={styles.infoBody}>
            • Realtime broadcast channel established{'\n'}
            • Token stored in hardware-backed SecureStore{'\n'}
            • Ready to control slides across cellular & Wi-Fi
          </Text>
        </GlassCard>

        <View style={styles.modeNotice}>
          <Text style={styles.modeNoticeTitle}>Select Your Operating Mode</Text>
          <Text style={styles.modeNoticeText}>
            Simply PPT requires you to choose a controller mode (Remote, Annotation, Presenter, or Speak Only). You can switch between them at any time during your talk.
          </Text>
        </View>

        <View style={styles.actions}>
          <GlowButton
            title="Choose Controller Mode"
            onPress={handleSelectMode}
            size="lg"
            icon={<LayoutGrid size={20} color={colors.textPrimary} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 26,
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
    paddingHorizontal: 16,
  },
  infoCard: {
    width: '100%',
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },
  infoBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  modeNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  modeNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modeNoticeText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    marginBottom: 10,
  },
});
