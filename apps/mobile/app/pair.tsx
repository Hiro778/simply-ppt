import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyRound, Smartphone, ArrowRight, ShieldAlert } from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { GlassCard } from '../src/components/GlassCard';
import { GlowButton } from '../src/components/GlowButton';
import { Header } from '../src/components/Header';
import { mobileSupabase } from '../src/lib/supabase-client';
import { secureStorage } from '../src/lib/secure-store';
import { triggerHaptic } from '../src/lib/haptics';

export default function PairScreen() {
  const router = useRouter();
  const [pairCode, setPairCode] = useState('');
  const [deviceName, setDeviceName] = useState('Android Controller');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDevice() {
      const savedName = await secureStorage.getDeviceName();
      setDeviceName(savedName);
    }
    loadDevice();
  }, []);

  function handleCodeChange(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setPairCode(cleaned);
    if (errorMessage) setErrorMessage(null);
  }

  async function handlePair() {
    if (pairCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the pairing code.');
      await triggerHaptic('error');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    await triggerHaptic('medium');

    try {
      const deviceId = await secureStorage.getOrCreateDeviceId();
      await secureStorage.saveDeviceName(deviceName.trim() || 'Android Controller');

      // 1. Resolve pair code against Supabase rate-limited RPC
      const resolveRes = await mobileSupabase.resolvePairCode(pairCode, deviceId);

      if (!resolveRes.success || !resolveRes.sessionId) {
        setErrorMessage(resolveRes.error || 'Invalid or expired pair code.');
        await triggerHaptic('error');
        setIsLoading(false);
        return;
      }

      // 2. Submit pairing request to active presentation session
      const submitRes = await mobileSupabase.submitPairing(
        resolveRes.sessionId,
        deviceId,
        deviceName.trim() || 'Android Controller'
      );

      if (!submitRes.success || !submitRes.requestId || !submitRes.requesterSecret) {
        setErrorMessage(submitRes.error || 'Failed to submit pairing request.');
        await triggerHaptic('error');
        setIsLoading(false);
        return;
      }

      // 3. Move to Approval Screen
      await triggerHaptic('success');
      router.push({
        pathname: '/approval',
        params: {
          title: resolveRes.title || 'Untitled Presentation',
          totalSlides: resolveRes.totalSlides?.toString() || '1',
          pairCode,
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      await triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Pair Device" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.intro}>
            <Text style={styles.title}>Enter 6-Digit Code</Text>
            <Text style={styles.subtitle}>
              Type the pairing code displayed on the desktop presentation screen.
            </Text>
          </View>

          {/* 6-Digit Display & Input */}
          <GlassCard style={styles.card} glow>
            <View style={styles.codeRow}>
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = pairCode[index] || '';
                const isCurrent = pairCode.length === index;
                return (
                  <View
                    key={index}
                    style={[
                      styles.digitBox,
                      digit ? styles.digitBoxFilled : null,
                      isCurrent ? styles.digitBoxActive : null,
                    ]}
                  >
                    <Text style={styles.digitText}>{digit}</Text>
                  </View>
                );
              })}
            </View>

            {/* Hidden absolute TextInput capturing numeric keyboard */}
            <TextInput
              value={pairCode}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={styles.hiddenInput}
            />

            <View style={styles.hintRow}>
              <KeyRound size={16} color={colors.textMuted} />
              <Text style={styles.hintText}>Single-use code • Expires in 3 minutes</Text>
            </View>
          </GlassCard>

          {/* Device Name Input */}
          <GlassCard style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <Smartphone size={18} color={colors.accent} />
              <Text style={styles.deviceLabel}>Device Name (Shown to presenter)</Text>
            </View>
            <TextInput
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="e.g. Hiro's Android Phone"
              placeholderTextColor={colors.textDisabled}
              style={styles.deviceNameInput}
            />
          </GlassCard>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <ShieldAlert size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Connect Action */}
          <View style={styles.actions}>
            <GlowButton
              title="Request Connection"
              onPress={handlePair}
              loading={isLoading}
              disabled={pairCode.length !== 6 || isLoading}
              size="lg"
              icon={<ArrowRight size={20} color={colors.textPrimary} />}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: 20,
  },
  intro: {
    marginTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 28,
    position: 'relative',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  digitBox: {
    width: 44,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFilled: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  digitBoxActive: {
    borderColor: colors.textPrimary,
    borderWidth: 2,
  },
  digitText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'monospace' : undefined,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deviceCard: {
    padding: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  deviceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deviceNameInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
    lineHeight: 18,
  },
  actions: {
    marginTop: 10,
  },
});
