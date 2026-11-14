import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Smartphone,
  Shield,
  Cloud,
  Vibrate,
  Trash2,
  Info,
  Check,
} from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { GlassCard } from '../src/components/GlassCard';
import { Header } from '../src/components/Header';
import { GlowButton } from '../src/components/GlowButton';
import { secureStorage } from '../src/lib/secure-store';
import { mobileSupabase } from '../src/lib/supabase-client';
import { triggerHaptic } from '../src/lib/haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      const dId = await secureStorage.getOrCreateDeviceId();
      const dName = await secureStorage.getDeviceName();
      const sId = await secureStorage.getSessionId();
      const token = await secureStorage.getDeviceToken();
      const custom = await secureStorage.getCustomSupabaseConfig();

      setDeviceId(dId);
      setDeviceName(dName);
      setSessionId(sId);
      setHasToken(!!token);
      if (custom.url) setCustomUrl(custom.url);
      if (custom.key) setCustomKey(custom.key);
    }
    loadData();
  }, []);

  async function handleSaveDeviceName() {
    await secureStorage.saveDeviceName(deviceName.trim());
    await triggerHaptic('success');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }

  async function handleSaveCustomSupabase() {
    await secureStorage.saveCustomSupabaseConfig(customUrl.trim(), customKey.trim());
    await triggerHaptic('success');
    Alert.alert('Configuration Saved', 'Custom Supabase credentials saved securely.');
  }

  async function handleDisconnectSession() {
    await triggerHaptic('warning');
    Alert.alert(
      'Disconnect Controller',
      'Are you sure you want to disconnect from the active presentation session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await triggerHaptic('error');
            await mobileSupabase.disconnect();
            setSessionId(null);
            setHasToken(false);
            router.replace('/welcome');
          },
        },
      ]
    );
  }

  async function handleClearAll() {
    await triggerHaptic('warning');
    Alert.alert(
      'Reset All Application Data',
      'This will erase all stored tokens, custom network URLs, and reset device identifier.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: async () => {
            await triggerHaptic('error');
            await mobileSupabase.disconnect();
            await secureStorage.clearAll();
            router.replace('/welcome');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Device Settings" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Device Identity */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Smartphone size={18} color={colors.accent} />
            <Text style={styles.cardTitle}>Device Identity</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Device Display Name</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={deviceName}
                onChangeText={setDeviceName}
                placeholder="Hiro's Android Controller"
                placeholderTextColor={colors.textDisabled}
                style={styles.input}
              />
              <TouchableOpacity onPress={handleSaveDeviceName} style={styles.saveBtn}>
                <Check size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {saveSuccess ? (
              <Text style={styles.savedHint}>✓ Device name saved</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Hardware ID (Anonymized)</Text>
            <Text style={styles.idText}>{deviceId}</Text>
          </View>
        </GlassCard>

        {/* Active Session & Security */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={18} color={colors.success} />
            <Text style={styles.cardTitle}>Security & Session State</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Active Session ID:</Text>
            <Text style={styles.valueText}>
              {sessionId ? `${sessionId.slice(0, 16)}...` : 'None (Unpaired)'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Secure Token Storage:</Text>
            <Text
              style={[
                styles.valueText,
                { color: hasToken ? colors.success : colors.textMuted },
              ]}
            >
              {hasToken ? 'Encrypted in SecureStore' : 'No Token'}
            </Text>
          </View>

          {sessionId ? (
            <GlowButton
              title="Disconnect Current Session"
              onPress={handleDisconnectSession}
              variant="danger"
              size="md"
              icon={<Trash2 size={16} color={colors.danger} />}
              style={styles.disconnectBtn}
            />
          ) : null}
        </GlassCard>

        {/* Haptics & Feedback */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Vibrate size={18} color={colors.info} />
            <Text style={styles.cardTitle}>Haptic Feedback</Text>
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Tactile Click Vibrations</Text>
              <Text style={styles.toggleSub}>Haptic pulse on button presses & slide transitions</Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={(val) => {
                setHapticEnabled(val);
                triggerHaptic('selection');
              }}
              thumbColor={hapticEnabled ? colors.accent : colors.surfaceBorder}
              trackColor={{ false: '#27272a', true: 'rgba(139, 92, 246, 0.4)' }}
            />
          </View>
        </GlassCard>

        {/* Custom Supabase Configuration */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Cloud size={18} color={colors.accent} />
            <Text style={styles.cardTitle}>Custom Supabase Endpoint</Text>
          </View>
          <Text style={styles.cardDescription}>
            Configure private cloud or self-hosted Supabase instances for enterprise air-gapped environments.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Supabase Project URL</Text>
            <TextInput
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="https://xyzcompany.supabase.co"
              placeholderTextColor={colors.textDisabled}
              style={styles.inputFull}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Supabase Anonymous Key</Text>
            <TextInput
              value={customKey}
              onChangeText={setCustomKey}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
              placeholderTextColor={colors.textDisabled}
              style={styles.inputFull}
              autoCapitalize="none"
              secureTextEntry
            />
          </View>

          <GlowButton
            title="Save Network Configuration"
            onPress={handleSaveCustomSupabase}
            variant="secondary"
            size="md"
          />
        </GlassCard>

        {/* App Info & Wipe Data */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleClearAll} style={styles.wipeBtn}>
            <Text style={styles.wipeText}>Erase Stored Credentials</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>
            Simply PPT for Android • Version 1.0.0 (Build 1){'\n'}
            © 2026 Simply PPT Project • Open Source MIT License
          </Text>
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
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 18,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  inputFull: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedHint: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  idText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  disconnectBtn: {
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toggleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  wipeBtn: {
    padding: 8,
  },
  wipeText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
