import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  RotateCcw,
  Hash,
  X,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { GlassCard } from '../../src/components/GlassCard';
import { Header } from '../../src/components/Header';
import { ModeSwitchBar } from '../../src/components/ModeSwitchBar';
import { mobileSupabase, ConnectionStatus } from '../../src/lib/supabase-client';
import { PresentationStatePayload } from '../../src/lib/protocol';
import { triggerHaptic } from '../../src/lib/haptics';

export default function RemoteModeScreen() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [deckTitle, setDeckTitle] = useState('Presentation');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    // Listen to real-time presentation state broadcasts from desktop
    const unsubState = mobileSupabase.onPresentationState((state: PresentationStatePayload) => {
      setCurrentSlide(state.currentSlide);
      if (state.totalSlides) setTotalSlides(state.totalSlides);
      if (state.title) setDeckTitle(state.title);
    });

    const unsubStatus = mobileSupabase.onStatusChange(setConnectionStatus);

    // Presentation stopwatch
    const timer = setInterval(() => {
      if (isTimerRunning) {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      unsubState();
      unsubStatus();
      clearInterval(timer);
    };
  }, [isTimerRunning]);

  async function handleNext() {
    await triggerHaptic('medium');
    mobileSupabase.sendCommand('NEXT_SLIDE', {});
    setCurrentSlide((prev) => (totalSlides > 0 ? Math.min(totalSlides, prev + 1) : prev + 1));
  }

  async function handlePrevious() {
    await triggerHaptic('light');
    mobileSupabase.sendCommand('PREVIOUS_SLIDE', {});
    setCurrentSlide((prev) => Math.max(1, prev - 1));
  }

  async function handleGoToSlide(num: number) {
    await triggerHaptic('selection');
    mobileSupabase.sendCommand('GO_TO_SLIDE', { slideNumber: num });
    setCurrentSlide(num);
    setIsDrawerOpen(false);
  }

  async function handleFirstSlide() {
    handleGoToSlide(1);
  }

  async function handleLastSlide() {
    if (totalSlides > 0) {
      handleGoToSlide(totalSlides);
    }
  }

  function formatTime(secs: number) {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Remote Mode"
        subtitle={deckTitle}
        showModesButton
        connectionStatus={connectionStatus}
      />

      <ModeSwitchBar currentMode="remote" />

      <View style={styles.container}>
        {/* Slide Counter & Timer Bar */}
        <GlassCard style={styles.statusBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsDrawerOpen(true)}
            style={styles.slideCounter}
          >
            <Hash size={18} color={colors.accent} />
            <Text style={styles.slideCounterText}>
              Slide <Text style={styles.slideBold}>{currentSlide}</Text> of {totalSlides}
            </Text>
          </TouchableOpacity>

          <View style={styles.timerBox}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
            <TouchableOpacity
              onPress={() => setElapsedSeconds(0)}
              style={styles.resetTimerButton}
            >
              <RotateCcw size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Quick Navigation: First / Last Slide */}
        <View style={styles.quickNavRow}>
          <TouchableOpacity
            onPress={handleFirstSlide}
            activeOpacity={0.7}
            style={styles.quickNavBtn}
          >
            <ChevronsLeft size={18} color={colors.textSecondary} />
            <Text style={styles.quickNavText}>First Slide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsDrawerOpen(true)}
            activeOpacity={0.7}
            style={styles.quickNavBtn}
          >
            <Text style={styles.quickNavText}>Jump to Slide...</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLastSlide}
            activeOpacity={0.7}
            style={styles.quickNavBtn}
          >
            <Text style={styles.quickNavText}>Last Slide</Text>
            <ChevronsRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Main Touch Buttons (Optimized for One-Handed Use) */}
        <View style={styles.buttonsContainer}>
          {/* Previous Slide Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handlePrevious}
            style={styles.prevButton}
          >
            <ChevronLeft size={36} color={colors.textPrimary} />
            <Text style={styles.prevButtonText}>PREVIOUS</Text>
          </TouchableOpacity>

          {/* Large Primary Next Slide Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleNext}
            style={styles.nextButton}
          >
            <View style={styles.nextInner}>
              <Text style={styles.nextButtonText}>NEXT SLIDE</Text>
              <ChevronRight size={44} color={colors.textPrimary} />
            </View>
            <Text style={styles.nextSubtext}>Tap anywhere to advance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slide Navigation Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerSheet}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Slide Navigation</Text>
              <TouchableOpacity
                onPress={() => setIsDrawerOpen(false)}
                style={styles.closeDrawerBtn}
              >
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.drawerGrid}>
              {Array.from({ length: totalSlides }, (_, i) => i + 1).map((num) => {
                const isSelected = num === currentSlide;
                return (
                  <TouchableOpacity
                    key={num}
                    activeOpacity={0.7}
                    onPress={() => handleGoToSlide(num)}
                    style={[styles.slideTile, isSelected && styles.slideTileActive]}
                  >
                    <Text
                      style={[
                        styles.slideTileText,
                        isSelected && styles.slideTileTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    padding: 20,
    justifyContent: 'space-between',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  slideCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slideCounterText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  slideBold: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  resetTimerButton: {
    padding: 4,
  },
  quickNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 10,
  },
  quickNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickNavText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  buttonsContainer: {
    flex: 1,
    gap: 16,
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  prevButton: {
    height: 90,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  prevButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  nextButton: {
    height: 220,
    borderRadius: 28,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  nextInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextButtonText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  nextSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    backgroundColor: colors.backgroundNavy,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 24,
    maxHeight: '75%',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeDrawerBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
  },
  drawerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  slideTile: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTileActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDark,
  },
  slideTileText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  slideTileTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
