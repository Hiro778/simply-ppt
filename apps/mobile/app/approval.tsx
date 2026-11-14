import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Monitor, Clock, XCircle } from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { GlassCard } from '../src/components/GlassCard';
import { GlowButton } from '../src/components/GlowButton';
import { Header } from '../src/components/Header';
import { mobileSupabase } from '../src/lib/supabase-client';
import { secureStorage } from '../src/lib/secure-store';
import { triggerHaptic } from '../src/lib/haptics';

export default function ApprovalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const title = (params.title as string) || 'Presentation';
  const totalSlides = (params.totalSlides as string) || '1';
  const pairCode = (params.pairCode as string) || '';

  const [timeLeft, setTimeLeft] = useState(180); // 3-minute expiration
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for waiting radar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Countdown timer
    const countdown = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          router.replace({
            pathname: '/error',
            params: { reason: 'Pairing request expired after 3 minutes without host response.' },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start polling status
    async function initPolling() {
      const requestId = await secureStorage.getRequestId();
      const requesterSecret = await secureStorage.getRequesterSecret();
      const sessionId = await secureStorage.getSessionId();

      if (!requestId || !requesterSecret || !sessionId) {
        router.replace('/pair');
        return;
      }

      mobileSupabase.startApprovalPolling(
        requestId,
        requesterSecret,
        async (deviceToken) => {
          // Host Approved!
          await triggerHaptic('success');
          // Connect Realtime command broadcast
          await mobileSupabase.connectRealtime(sessionId, deviceToken);
          router.replace('/connected');
        },
        async () => {
          // Host Rejected
          await triggerHaptic('error');
          router.replace({
            pathname: '/error',
            params: { reason: 'The desktop host declined your pairing request.' },
          });
        },
        async (err) => {
          // Timeout or Network Failure
          await triggerHaptic('error');
          router.replace({
            pathname: '/error',
            params: { reason: err },
          });
        }
      );
    }

    initPolling();

    return () => {
      clearInterval(countdown);
      mobileSupabase.stopPolling();
    };
  }, []);

  async function handleCancel() {
    await triggerHaptic('medium');
    mobileSupabase.stopPolling();
    await secureStorage.clearSession();
    router.replace('/pair');
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Approval Required" />

      <View style={styles.container}>
        <View style={styles.radarContainer}>
          <Animated.View
            style={[
              styles.radarRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={styles.radarCenter}>
            <Monitor size={38} color={colors.accent} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.statusTitle}>Waiting for Host Approval</Text>
          <Text style={styles.statusDescription}>
            A prompt has appeared on the desktop screen. Please ask the presenter to click{' '}
            <Text style={styles.boldText}>"Approve"</Text>.
          </Text>
        </View>

        {/* Deck preview */}
        <GlassCard style={styles.deckCard} glow>
          <View style={styles.deckHeader}>
            <ShieldCheck size={20} color={colors.success} />
            <Text style={styles.deckVerified}>Verified Presentation Session</Text>
          </View>
          <Text style={styles.deckTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{totalSlides} slides</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>Code: {pairCode}</Text>
          </View>
        </GlassCard>

        {/* Countdown */}
        <View style={styles.timerRow}>
          <Clock size={16} color={colors.warning} />
          <Text style={styles.timerText}>
            Expires in <Text style={styles.timerNumber}>{formatTimer(timeLeft)}</Text>
          </Text>
        </View>

        {/* Cancel button */}
        <View style={styles.actions}>
          <GlowButton
            title="Cancel Request"
            onPress={handleCancel}
            variant="ghost"
            size="md"
            icon={<XCircle size={18} color={colors.textSecondary} />}
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
  radarContainer: {
    marginTop: 20,
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1.5,
    borderColor: colors.surfaceBorderAccent,
  },
  radarCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(24, 24, 37, 0.9)',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  boldText: {
    color: colors.accent,
    fontWeight: '700',
  },
  deckCard: {
    width: '100%',
    padding: 18,
  },
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deckVerified: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deckTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  metaDot: {
    color: colors.textMuted,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  timerText: {
    fontSize: 13,
    color: colors.warning,
  },
  timerNumber: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    width: '100%',
    marginBottom: 10,
  },
});
