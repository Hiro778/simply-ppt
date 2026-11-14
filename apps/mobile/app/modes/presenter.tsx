import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Radio,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Maximize2,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { GlassCard } from '../../src/components/GlassCard';
import { Header } from '../../src/components/Header';
import { ModeSwitchBar } from '../../src/components/ModeSwitchBar';
import { mobileSupabase } from '../../src/lib/supabase-client';
import { PresentationStatePayload } from '../../src/lib/protocol';
import { triggerHaptic } from '../../src/lib/haptics';

export default function PresenterModeScreen() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [deckTitle, setDeckTitle] = useState('Presentation');
  const [notes, setNotes] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: 0.5, y: 0.5 });

  const padLayout = useRef({ width: 1, height: 1 });
  const lastLaserSend = useRef(0);

  useEffect(() => {
    const unsub = mobileSupabase.onPresentationState((state: PresentationStatePayload) => {
      setCurrentSlide(state.currentSlide);
      if (state.totalSlides) setTotalSlides(state.totalSlides);
      if (state.title) setDeckTitle(state.title);
      if (state.notes) setNotes(state.notes);
    });
    return unsub;
  }, []);

  // Laser Pointer Touchpad PanResponder (~60 Hz maximum update rate)
  const laserResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsLaserActive(true);
        triggerHaptic('selection');
        updateLaser(evt.nativeEvent.locationX, evt.nativeEvent.locationY, true);
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const now = Date.now();
        // 60 Hz = ~16ms interval
        if (now - lastLaserSend.current >= 16) {
          lastLaserSend.current = now;
          updateLaser(evt.nativeEvent.locationX, evt.nativeEvent.locationY, true);
        }
      },

      onPanResponderRelease: () => {
        setIsLaserActive(false);
        // Hide laser dot on release
        mobileSupabase.sendCommand('LASER_POINTER', {
          x: laserPos.x,
          y: laserPos.y,
          visible: false,
        });
      },
    })
  ).current;

  function updateLaser(px: number, py: number, visible: boolean) {
    const normX = Math.min(1, Math.max(0, px / padLayout.current.width));
    const normY = Math.min(1, Math.max(0, py / padLayout.current.height));

    const point = {
      x: Number(normX.toFixed(4)),
      y: Number(normY.toFixed(4)),
    };
    setLaserPos(point);

    mobileSupabase.sendCommand('LASER_POINTER', {
      ...point,
      visible,
    });
  }

  // Zoom Controls
  async function handleZoom(newScale: number) {
    const clamped = Math.min(5.0, Math.max(1.0, Number(newScale.toFixed(2))));
    setZoomScale(clamped);
    await triggerHaptic('selection');

    mobileSupabase.sendCommand('ZOOM', {
      scale: clamped,
      originX: 0.5,
      originY: 0.5,
    });
  }

  async function handleResetZoom() {
    setZoomScale(1.0);
    await triggerHaptic('medium');
    mobileSupabase.sendCommand('ZOOM', {
      scale: 1.0,
      originX: 0.5,
      originY: 0.5,
    });
  }

  async function handleSelectSlide(num: number) {
    await triggerHaptic('selection');
    mobileSupabase.sendCommand('GO_TO_SLIDE', { slideNumber: num });
    setCurrentSlide(num);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Presenter Mode" subtitle={deckTitle} showModesButton />
      <ModeSwitchBar currentMode="presenter" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Slide Previews Card */}
        <View style={styles.previewRow}>
          {/* Current Slide Card */}
          <GlassCard style={styles.previewCard} glow>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>CURRENT SLIDE</Text>
            </View>
            <View style={styles.previewCanvas}>
              <Text style={styles.previewSlideNumber}>{currentSlide}</Text>
            </View>
            <Text style={styles.previewFooter}>
              Slide {currentSlide} of {totalSlides}
            </Text>
          </GlassCard>

          {/* Next Slide Preview Card */}
          <GlassCard style={styles.previewCard}>
            <View style={[styles.previewBadge, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Text style={[styles.previewBadgeText, { color: colors.textSecondary }]}>
                NEXT SLIDE
              </Text>
            </View>
            <View style={[styles.previewCanvas, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
              <Text style={[styles.previewSlideNumber, { color: colors.textMuted }]}>
                {Math.min(totalSlides, currentSlide + 1)}
              </Text>
            </View>
            <Text style={styles.previewFooter}>
              Up next: Slide {Math.min(totalSlides, currentSlide + 1)}
            </Text>
          </GlassCard>
        </View>

        {/* Thumbnail direct navigation strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbStrip}
        >
          {Array.from({ length: totalSlides }, (_, i) => i + 1).map((num) => {
            const isSelected = num === currentSlide;
            return (
              <TouchableOpacity
                key={num}
                activeOpacity={0.7}
                onPress={() => handleSelectSlide(num)}
                style={[styles.thumbBox, isSelected && styles.thumbBoxActive]}
              >
                <Text style={[styles.thumbText, isSelected && styles.thumbTextActive]}>
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Virtual Laser Pointer Surface */}
        <GlassCard style={styles.laserCard}>
          <View style={styles.laserHeader}>
            <View style={styles.laserTitleRow}>
              <Radio size={18} color="#ef4444" />
              <Text style={styles.laserTitle}>Virtual Laser Pointer</Text>
            </View>
            <Text style={styles.laserHint}>Hold and drag finger to aim</Text>
          </View>

          <View
            style={styles.laserSurface}
            onLayout={(e) => {
              padLayout.current = e.nativeEvent.layout;
            }}
            {...laserResponder.panHandlers}
          >
            {isLaserActive ? (
              <View
                style={[
                  styles.laserDot,
                  {
                    left: `${laserPos.x * 100}%`,
                    top: `${laserPos.y * 100}%`,
                  },
                ]}
              />
            ) : null}
            <Text style={styles.laserSurfaceText}>
              {isLaserActive ? 'Laser Active' : 'Touch surface to activate laser'}
            </Text>
          </View>
        </GlassCard>

        {/* Regional Canvas Zoom Controls */}
        <GlassCard style={styles.zoomCard}>
          <View style={styles.zoomHeader}>
            <View style={styles.zoomTitleRow}>
              <Maximize2 size={18} color={colors.accent} />
              <Text style={styles.zoomTitle}>Regional Canvas Zoom ({zoomScale.toFixed(1)}x)</Text>
            </View>
            {zoomScale > 1.0 ? (
              <TouchableOpacity onPress={handleResetZoom} style={styles.resetZoomBtn}>
                <RotateCcw size={14} color={colors.textSecondary} />
                <Text style={styles.resetZoomText}>Reset</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.zoomButtonsRow}>
            <TouchableOpacity
              onPress={() => handleZoom(zoomScale - 0.25)}
              disabled={zoomScale <= 1.0}
              style={[styles.zoomBtn, zoomScale <= 1.0 && styles.zoomBtnDisabled]}
            >
              <ZoomOut size={18} color={colors.textPrimary} />
              <Text style={styles.zoomBtnText}>Zoom Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleZoom(1.5)}
              style={[styles.zoomPresetBtn, zoomScale === 1.5 && styles.zoomPresetActive]}
            >
              <Text style={styles.zoomPresetText}>1.5x</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleZoom(2.0)}
              style={[styles.zoomPresetBtn, zoomScale === 2.0 && styles.zoomPresetActive]}
            >
              <Text style={styles.zoomPresetText}>2.0x</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleZoom(zoomScale + 0.25)}
              disabled={zoomScale >= 5.0}
              style={[styles.zoomBtn, zoomScale >= 5.0 && styles.zoomBtnDisabled]}
            >
              <ZoomIn size={18} color={colors.textPrimary} />
              <Text style={styles.zoomBtnText}>Zoom In</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Presenter Slide Notes (Only shown if presenter notes are available) */}
        {notes ? (
          <GlassCard style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <FileText size={18} color={colors.accent} />
              <Text style={styles.notesTitle}>Speaker Notes (Slide {currentSlide})</Text>
            </View>
            <Text style={styles.notesContent}>{notes}</Text>
          </GlassCard>
        ) : null}
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
  previewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  previewBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  previewCanvas: {
    width: '100%',
    height: 90,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 15, 26, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  previewSlideNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  previewFooter: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  thumbStrip: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBoxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDark,
  },
  thumbText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  thumbTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  laserCard: {
    padding: 16,
  },
  laserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  laserTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  laserTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  laserHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  laserSurface: {
    height: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 11, 20, 0.95)',
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  laserSurfaceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.25)',
    fontWeight: '600',
  },
  laserDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    marginLeft: -9,
    marginTop: -9,
    shadowColor: '#ef4444',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },
  zoomCard: {
    padding: 16,
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  zoomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resetZoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  resetZoomText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  zoomButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  zoomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  zoomBtnDisabled: {
    opacity: 0.4,
  },
  zoomBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  zoomPresetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPresetActive: {
    backgroundColor: colors.accent,
  },
  zoomPresetText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notesCard: {
    padding: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notesContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
