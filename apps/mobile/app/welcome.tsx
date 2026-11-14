import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Wifi, Sliders, ArrowRight, Settings } from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { GlassCard } from '../src/components/GlassCard';
import { GlowButton } from '../src/components/GlowButton';
import { triggerHaptic } from '../src/lib/haptics';

export default function WelcomeScreen() {
  const router = useRouter();

  async function handleGetStarted() {
    await triggerHaptic('medium');
    router.push('/pair');
  }

  async function handleOpenSettings() {
    await triggerHaptic('selection');
    router.push('/settings');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logoBadge}>SIMPLY PPT</Text>
          <Text style={styles.heading}>Turn your phone into a professional slide remote</Text>
          <Text style={styles.subheading}>
            Connect seamlessly across cellular and Wi-Fi networks with zero presentation cloud uploads.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <GlassCard style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <ShieldCheck size={22} color={colors.success} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Local-First Document Privacy</Text>
                <Text style={styles.featureDescription}>
                  Your slides stay strictly on your laptop. Only encrypted control signals travel across the network.
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Wifi size={22} color={colors.accent} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Cross-Network Pairing</Text>
                <Text style={styles.featureDescription}>
                  No shared Wi-Fi needed. Works when your phone is on 4G/5G mobile data and your laptop is on office Wi-Fi.
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Sliders size={22} color={colors.info} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>4 Presentation Modes</Text>
                <Text style={styles.featureDescription}>
                  One-handed Remote, Stylus Annotations, Virtual Laser Pointer, and 3 Indonesian Voice Commands.
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        <View style={styles.actions}>
          <GlowButton
            title="Connect Presentation"
            onPress={handleGetStarted}
            size="lg"
            icon={<ArrowRight size={20} color={colors.textPrimary} />}
          />

          <GlowButton
            title="Settings & Network"
            onPress={handleOpenSettings}
            variant="ghost"
            size="md"
            icon={<Settings size={18} color={colors.textSecondary} />}
            style={styles.settingsButton}
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
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  logoBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 36,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 14,
    marginVertical: 16,
  },
  featureCard: {
    padding: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  settingsButton: {
    marginTop: 4,
  },
});
