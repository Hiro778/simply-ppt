import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
  Send,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { GlassCard } from '../../src/components/GlassCard';
import { Header } from '../../src/components/Header';
import { ModeSwitchBar } from '../../src/components/ModeSwitchBar';
import { mobileSupabase } from '../../src/lib/supabase-client';
import { voiceRecognizer, VoiceState } from '../../src/lib/voice-recognizer';
import { triggerHaptic } from '../../src/lib/haptics';

export default function SpeakOnlyModeScreen() {
  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [rmsVolume, setRmsVolume] = useState(0.2);

  // Sound waveform bar animations
  const waveHeights = [
    useRef(new Animated.Value(20)).current,
    useRef(new Animated.Value(35)).current,
    useRef(new Animated.Value(55)).current,
    useRef(new Animated.Value(75)).current,
    useRef(new Animated.Value(60)).current,
    useRef(new Animated.Value(40)).current,
    useRef(new Animated.Value(25)).current,
  ];

  useEffect(() => {
    const unsubState = voiceRecognizer.onStateChange((s) => {
      setVoiceState(s);
      setIsListening(voiceRecognizer.getIsListening());
    });

    const unsubResult = voiceRecognizer.onResult((evt) => {
      if (evt.recognized && evt.commandType) {
        setLastFeedback(`✓ ${evt.message}`);

        // Dispatch command to presentation host
        if (evt.commandType === 'NEXT_SLIDE') {
          mobileSupabase.sendCommand('NEXT_SLIDE', {});
        } else if (evt.commandType === 'PREVIOUS_SLIDE') {
          mobileSupabase.sendCommand('PREVIOUS_SLIDE', {});
        } else if (evt.commandType === 'GO_TO_SLIDE' && evt.slideNumber) {
          mobileSupabase.sendCommand('GO_TO_SLIDE', { slideNumber: evt.slideNumber });
        }
      } else {
        setLastFeedback(evt.message || 'Perintah tidak dikenali.');
      }
    });

    const unsubRms = voiceRecognizer.onRmsChanged((rms) => {
      setRmsVolume(rms);
      waveHeights.forEach((anim, i) => {
        const factor = (i === 3 ? 1.0 : i === 2 || i === 4 ? 0.8 : 0.5) * rms;
        Animated.timing(anim, {
          toValue: Math.max(12, Math.min(80, factor * 90)),
          duration: 90,
          useNativeDriver: false,
        }).start();
      });
    });

    return () => {
      unsubState();
      unsubResult();
      unsubRms();
      voiceRecognizer.stopListening();
    };
  }, []);

  async function handleToggleListening() {
    await triggerHaptic('medium');
    if (isListening) {
      voiceRecognizer.stopListening();
    } else {
      await voiceRecognizer.startListening();
      setLastFeedback('Mendengarkan... Ucapkan perintah Bahasa Indonesia.');
    }
  }

  function handleSimulateSpeech(phrase: string) {
    voiceRecognizer.processTranscript(phrase);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Speak Only Mode"
        subtitle="3 Indonesian Commands"
        showModesButton
      />
      <ModeSwitchBar currentMode="speak_only" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Microphone Hero Controller */}
        <GlassCard style={styles.micCard} glow={isListening}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggleListening}
            style={[styles.micButton, isListening ? styles.micButtonActive : styles.micButtonInactive]}
          >
            {isListening ? (
              <Mic size={54} color="#ffffff" />
            ) : (
              <MicOff size={48} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          <Text style={styles.micStatusText}>
            {isListening ? 'Mendengarkan (Listening)' : 'Mikrofon Nonaktif (Tap to Start)'}
          </Text>

          {/* Animated Waveform Visualization */}
          {isListening ? (
            <View style={styles.waveformContainer}>
              {waveHeights.map((anim, idx) => (
                <Animated.View
                  key={idx}
                  style={[
                    styles.waveformBar,
                    {
                      height: anim,
                      backgroundColor:
                        voiceState === 'recognized'
                          ? colors.success
                          : colors.accent,
                    },
                  ]}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.micHint}>
              Tap the microphone to start hands-free voice control
            </Text>
          )}

          {/* Recognition Feedback Chip */}
          {lastFeedback ? (
            <View
              style={[
                styles.feedbackChip,
                voiceState === 'recognized' ? styles.feedbackSuccess : styles.feedbackNeutral,
              ]}
            >
              {voiceState === 'recognized' ? (
                <CheckCircle2 size={16} color={colors.success} />
              ) : (
                <AlertCircle size={16} color={colors.warning} />
              )}
              <Text
                style={[
                  styles.feedbackText,
                  voiceState === 'recognized' && { color: colors.success },
                ]}
              >
                {lastFeedback}
              </Text>
            </View>
          ) : null}
        </GlassCard>

        {/* Strictly Allowed Commands Card */}
        <GlassCard style={styles.commandsCard}>
          <View style={styles.commandsHeader}>
            <ShieldCheck size={18} color={colors.success} />
            <Text style={styles.commandsTitle}>Strict Indonesian Voice Contract</Text>
          </View>
          <Text style={styles.commandsSubtitle}>
            Only these 3 exact phrases trigger presentation actions. All other words are strictly ignored.
          </Text>

          <View style={styles.commandList}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSimulateSpeech('Lanjut slide')}
              style={styles.commandItem}
            >
              <View style={styles.commandBadge}>
                <Text style={styles.commandBadgeText}>1</Text>
              </View>
              <View style={styles.commandDetails}>
                <Text style={styles.commandPhrase}>"Lanjut slide"</Text>
                <Text style={styles.commandAction}>Advances to Next Slide</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSimulateSpeech('Slide sebelumnya')}
              style={styles.commandItem}
            >
              <View style={styles.commandBadge}>
                <Text style={styles.commandBadgeText}>2</Text>
              </View>
              <View style={styles.commandDetails}>
                <Text style={styles.commandPhrase}>"Slide sebelumnya"</Text>
                <Text style={styles.commandAction}>Returns to Previous Slide</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSimulateSpeech('Slide 5')}
              style={styles.commandItem}
            >
              <View style={styles.commandBadge}>
                <Text style={styles.commandBadgeText}>3</Text>
              </View>
              <View style={styles.commandDetails}>
                <Text style={styles.commandPhrase}>"Slide [nomor]" (e.g. "Slide 5")</Text>
                <Text style={styles.commandAction}>Jumps directly to slide number</Text>
              </View>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Direct Speech Test Input */}
        <GlassCard style={styles.testCard}>
          <Text style={styles.testLabel}>Test Spoken Phrase Input</Text>
          <View style={styles.testInputRow}>
            <TextInput
              value={testInput}
              onChangeText={setTestInput}
              placeholder='e.g. "Lanjut slide" or "Slide 3"'
              placeholderTextColor={colors.textDisabled}
              style={styles.testInput}
            />
            <TouchableOpacity
              onPress={() => {
                if (testInput.trim()) {
                  handleSimulateSpeech(testInput.trim());
                  setTestInput('');
                }
              }}
              style={styles.testSendBtn}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Android Background Policy Notice */}
        <View style={styles.noticeCard}>
          <Info size={16} color={colors.textMuted} />
          <Text style={styles.noticeText}>
            <Text style={{ fontWeight: '700' }}>Android Platform Notice:</Text> Android security restrictions restrict continuous microphone capture when the application is backgrounded or when the phone screen is turned off. For uninterrupted voice recognition, keep Simply PPT active in the foreground.
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
    padding: 16,
    gap: 14,
  },
  micCard: {
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  micButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  micButtonActive: {
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.accentDark,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 12,
  },
  micButtonInactive: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
  },
  micStatusText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  micHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 80,
    marginVertical: 6,
  },
  waveformBar: {
    width: 7,
    borderRadius: 4,
  },
  feedbackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 12,
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  feedbackNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commandsCard: {
    padding: 18,
  },
  commandsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commandsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commandsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  commandList: {
    gap: 10,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  commandBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commandBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  commandDetails: {
    flex: 1,
  },
  commandPhrase: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  commandAction: {
    fontSize: 11,
    color: colors.textMuted,
  },
  testCard: {
    padding: 16,
  },
  testLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  testInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testInput: {
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
  testSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
