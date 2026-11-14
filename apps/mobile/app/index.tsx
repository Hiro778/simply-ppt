import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Cast } from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { secureStorage } from '../src/lib/secure-store';
import { mobileSupabase } from '../src/lib/supabase-client';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Verification check for active stored credentials
    const timer = setTimeout(async () => {
      const sessionId = await secureStorage.getSessionId();
      const deviceToken = await secureStorage.getDeviceToken();

      if (sessionId && deviceToken) {
        // Resume session
        await mobileSupabase.connectRealtime(sessionId, deviceToken);
        router.replace('/connected');
      } else {
        router.replace('/welcome');
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <Cast size={48} color={colors.accent} />
        </View>

        <Text style={styles.title}>Simply PPT</Text>
        <Text style={styles.tagline}>A smarter way to present.</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Mobile Controller • v1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.surfaceBorderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  badge: {
    marginTop: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
