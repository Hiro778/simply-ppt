'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { PresentationSettings, ScaleMode, TransitionEffect } from '@/lib/presentation/types';
import { Monitor, Sparkles, Keyboard, Cloud, Wifi } from 'lucide-react';
import { pairingService } from '@/lib/supabase/service';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PresentationSettings;
  onSaveSettings: (settings: PresentationSettings) => void;
  cloudMode: 'supabase' | 'local';
}

const PRESET_COLORS = [
  { name: 'Pure Black', value: '#000000', label: 'Recommended for OLED & projectors' },
  { name: 'Obsidian Slate', value: '#09090b', label: 'Default dark theme' },
  { name: 'Deep Violet', value: '#0f0a1e', label: 'Brand aesthetic' },
  { name: 'Studio Dark', value: '#18181b', label: 'Neutral charcoal' },
];

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  cloudMode,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'display' | 'cloud' | 'shortcuts'>('display');
  const [localSettings, setLocalSettings] = useState<PresentationSettings>(settings);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; latencyMs?: number } | null>(null);

  async function handleTestConnection() {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await pairingService.testConnection();
      setTestResult(res);
    } catch {
      setTestResult({ connected: false });
    } finally {
      setTestingConnection(false);
    }
  }

  function handleSave() {
    onSaveSettings(localSettings);
    onClose();
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Application Settings"
      description="Customize presentation display scaling, background styling, and cloud synchronization."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('display')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'display'
                ? 'border-violet-500 text-violet-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Display & Stage
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-violet-500 text-violet-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            Cloud Pairing
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'border-violet-500 text-violet-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Keyboard Shortcuts
          </button>
        </div>

        {/* Tab 1: Display & Stage */}
        {activeTab === 'display' && (
          <div className="space-y-5 text-sm">
            {/* Background Color */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
                Stage Background Color
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, backgroundColor: c.value })}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      localSettings.backgroundColor === c.value
                        ? 'border-violet-500 bg-violet-950/30'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-lg border border-zinc-700 shrink-0 shadow-inner"
                      style={{ backgroundColor: c.value }}
                    />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{c.name}</p>
                      <p className="text-[11px] text-zinc-500">{c.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scaling Mode */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Presentation Scaling
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['contain', 'fit-width', 'original'] as ScaleMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, scaleMode: mode })}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize transition-all ${
                      localSettings.scaleMode === mode
                        ? 'border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {mode === 'contain' ? 'Fit Screen (Aspect Ratio)' : mode === 'fit-width' ? 'Fit to Width' : 'Original 100%'}
                  </button>
                ))}
              </div>
            </div>

            {/* Transition Effect */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Slide Transition Effect
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cut', 'fade', 'slide'] as TransitionEffect[]).map((effect) => (
                  <button
                    key={effect}
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, transitionEffect: effect })}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize transition-all ${
                      localSettings.transitionEffect === effect
                        ? 'border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {effect === 'cut' ? 'Instant (Cut)' : effect === 'fade' ? 'Smooth Fade' : 'Slide Push'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cloud Pairing */}
        {activeTab === 'cloud' && (
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-zinc-200">Supabase Cloud Signaling</h4>
                  <p className="text-xs text-zinc-400">
                    Cross-network pairing operates over Supabase Realtime without Wi-Fi boundaries.
                  </p>
                </div>
                <Badge variant={cloudMode === 'supabase' ? 'success' : 'default'}>
                  {cloudMode === 'supabase' ? 'Configured' : 'Offline Mode'}
                </Badge>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                >
                  <Wifi className="w-3.5 h-3.5 mr-1.5" />
                  {testingConnection ? 'Testing latency...' : 'Test Connection'}
                </Button>

                {testResult && (
                  <span
                    className={`text-xs font-medium ${
                      testResult.connected ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {testResult.connected
                      ? `Connected (${testResult.latencyMs || '<10'}ms round-trip)`
                      : 'Connection test failed'}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-800/30 text-xs text-violet-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Zero Document Cloud Exposure Guarantee
              </p>
              <p className="text-zinc-400">
                Your presentation PDFs remain stored solely on your computer. Only short-lived control signals, slide indices, and pointer coordinates pass through Supabase.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Keyboard Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Next Slide</span>
                <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">→ / Space / PageDown</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Previous Slide</span>
                <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">← / Backspace / PageUp</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Toggle Fullscreen</span>
                <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">F</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Exit Presentation</span>
                <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">Escape</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Black Screen</span>
                <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">B</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">White Screen</span>
                <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">W</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Jump to Slide Dialog</span>
                <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">G</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">Mobile Pair QR/Code</span>
                <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">P</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
