import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PenTool,
  Highlighter,
  RotateCcw,
  Trash2,
  Check,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { GlassCard } from '../../src/components/GlassCard';
import { Header } from '../../src/components/Header';
import { ModeSwitchBar } from '../../src/components/ModeSwitchBar';
import { mobileSupabase } from '../../src/lib/supabase-client';
import { Point } from '../../src/lib/protocol';
import { triggerHaptic } from '../../src/lib/haptics';

export default function AnnotationModeScreen() {
  const [tool, setTool] = useState<'pen' | 'highlighter'>('pen');
  const [selectedColor, setSelectedColor] = useState(colors.palette[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [highlightOpacity, setHighlightOpacity] = useState(0.4);
  const [historyCount, setHistoryCount] = useState(0);

  // Surface dimensions for coordinate normalization
  const canvasLayout = useRef({ width: 1, height: 1, x: 0, y: 0 });
  const currentPoints = useRef<Point[]>([]);
  const lastSendTime = useRef(0);

  // PanResponder to track touch gestures and normalize coordinates to [0.0, 1.0]
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const normX = Math.min(1, Math.max(0, locationX / canvasLayout.current.width));
        const normY = Math.min(1, Math.max(0, locationY / canvasLayout.current.height));

        currentPoints.current = [{ x: Number(normX.toFixed(4)), y: Number(normY.toFixed(4)) }];
        triggerHaptic('selection');
      },

      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        const normX = Math.min(1, Math.max(0, locationX / canvasLayout.current.width));
        const normY = Math.min(1, Math.max(0, locationY / canvasLayout.current.height));

        currentPoints.current.push({ x: Number(normX.toFixed(4)), y: Number(normY.toFixed(4)) });

        // Throttle transmission to ~30-40 Hz to prevent network congestion
        const now = Date.now();
        if (now - lastSendTime.current > 30 && currentPoints.current.length >= 2) {
          lastSendTime.current = now;
          emitCurrentStroke(false);
        }
      },

      onPanResponderRelease: () => {
        if (currentPoints.current.length > 0) {
          emitCurrentStroke(true);
          setHistoryCount((c) => c + 1);
        }
        currentPoints.current = [];
      },
    })
  ).current;

  function emitCurrentStroke(isFinal: boolean) {
    if (currentPoints.current.length === 0) return;

    if (tool === 'pen') {
      mobileSupabase.sendCommand('DRAW', {
        points: [...currentPoints.current],
        color: selectedColor,
        strokeWidth: strokeWidth,
      });
    } else {
      mobileSupabase.sendCommand('HIGHLIGHT', {
        points: [...currentPoints.current],
        color: selectedColor,
        strokeWidth: strokeWidth * 3.5,
        opacity: highlightOpacity,
      });
    }
  }

  async function handleUndo() {
    await triggerHaptic('light');
    if (historyCount > 0) {
      setHistoryCount((c) => c - 1);
      // Re-trigger current state or slide reload
    }
  }

  async function handleClear() {
    await triggerHaptic('warning');
    Alert.alert(
      'Clear Annotations',
      'Remove all drawings and highlights from the current slide?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await triggerHaptic('error');
            mobileSupabase.sendCommand('CLEAR_ANNOTATION', {});
            setHistoryCount(0);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Annotation Mode" subtitle="Stylus & Canvas" showModesButton />
      <ModeSwitchBar currentMode="annotation" />

      <View style={styles.container}>
        {/* Drawing Surface Canvas */}
        <View
          style={styles.canvasContainer}
          onLayout={(e) => {
            canvasLayout.current = e.nativeEvent.layout;
          }}
          {...panResponder.panHandlers}
        >
          <View style={styles.canvasWatermark}>
            <PenTool size={32} color="rgba(255, 255, 255, 0.08)" />
            <Text style={styles.watermarkText}>
              Draw on this touch pad to annotate slide in real-time
            </Text>
          </View>
        </View>

        {/* Floating Tool Controls */}
        <GlassCard style={styles.toolbar}>
          {/* Tool Selector: Pen vs Highlighter */}
          <View style={styles.toolRow}>
            <TouchableOpacity
              onPress={() => {
                setTool('pen');
                setStrokeWidth(4);
                triggerHaptic('selection');
              }}
              style={[styles.toolBtn, tool === 'pen' && styles.toolBtnActive]}
            >
              <PenTool size={18} color={tool === 'pen' ? '#fff' : colors.textMuted} />
              <Text style={[styles.toolText, tool === 'pen' && styles.toolTextActive]}>
                Pen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTool('highlighter');
                setStrokeWidth(12);
                triggerHaptic('selection');
              }}
              style={[styles.toolBtn, tool === 'highlighter' && styles.toolBtnActive]}
            >
              <Highlighter
                size={18}
                color={tool === 'highlighter' ? '#fff' : colors.textMuted}
              />
              <Text style={[styles.toolText, tool === 'highlighter' && styles.toolTextActive]}>
                Highlighter
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity onPress={handleUndo} style={styles.iconActionBtn}>
              <RotateCcw size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClear} style={styles.iconActionBtn}>
              <Trash2 size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>

          {/* Color Palette */}
          <View style={styles.paletteRow}>
            {colors.palette.map((hex) => {
              const isSelected = selectedColor === hex;
              return (
                <TouchableOpacity
                  key={hex}
                  onPress={() => {
                    setSelectedColor(hex);
                    triggerHaptic('selection');
                  }}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: hex },
                    isSelected && styles.colorCircleActive,
                  ]}
                >
                  {isSelected ? (
                    <Check
                      size={14}
                      color={hex === '#ffffff' || hex === '#facc15' ? '#000' : '#fff'}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stroke Width Selector */}
          <View style={styles.strokeRow}>
            <Text style={styles.strokeLabel}>
              {tool === 'pen' ? 'Stroke Width' : 'Highlighter Thickness'}
            </Text>
            <View style={styles.strokeOptions}>
              {[2, 4, 8, 16].map((w) => {
                const isActive = strokeWidth === w;
                return (
                  <TouchableOpacity
                    key={w}
                    onPress={() => {
                      setStrokeWidth(w);
                      triggerHaptic('selection');
                    }}
                    style={[styles.strokePill, isActive && styles.strokePillActive]}
                  >
                    <View
                      style={{
                        width: w * 1.5,
                        height: w * 1.5,
                        borderRadius: (w * 1.5) / 2,
                        backgroundColor: isActive ? colors.accent : colors.textMuted,
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </GlassCard>
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
    padding: 16,
    gap: 12,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: 'rgba(14, 15, 26, 0.95)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvasWatermark: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  watermarkText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.2)',
    textAlign: 'center',
    fontWeight: '500',
  },
  toolbar: {
    padding: 14,
    gap: 12,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  toolBtnActive: {
    backgroundColor: colors.accent,
  },
  toolText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toolTextActive: {
    color: '#fff',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 4,
  },
  iconActionBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  strokeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  strokeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  strokeOptions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  strokePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strokePillActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
});
