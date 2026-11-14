'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/navbar';
import { UploadDropzone } from '@/components/dashboard/upload-dropzone';
import { RecentPresentations } from '@/components/dashboard/recent-presentations';
import { PresentationHistory } from '@/components/dashboard/presentation-history';
import { SettingsModal } from '@/components/dashboard/settings-modal';
import { PairingModal } from '@/components/pairing/pairing-modal';
import { ApprovalDialog } from '@/components/pairing/approval-dialog';
import { PairedDevicesDrawer } from '@/components/pairing/paired-devices-drawer';
import { TestController } from '@/components/pairing/test-controller';
import { PresentationViewer } from '@/components/presentation/presentation-viewer';
import {
  StoredPresentation,
  getAllPresentations,
  deletePresentation,
  recordPresentationSession,
  getPresentationHistory,
  PresentationHistoryItem,
} from '@/lib/storage/db';
import { DEFAULT_SETTINGS, PresentationSettings } from '@/lib/presentation/types';
import { CommandType } from '@/lib/protocol/types';
import {
  pairingService,
  PresentationSession,
  PairingRequest,
  PairedDevice,
} from '@/lib/supabase/service';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { Sparkles, Layers, History, Shield, Smartphone } from 'lucide-react';

export default function DashboardPage() {
  const [presentations, setPresentations] = useState<StoredPresentation[]>([]);
  const [history, setHistory] = useState<PresentationHistoryItem[]>([]);
  const [activePresentation, setActivePresentation] = useState<StoredPresentation | null>(null);
  const [activeSession, setActiveSession] = useState<PresentationSession | null>(null);
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [pendingRequest, setPendingRequest] = useState<PairingRequest | null>(null);

  // Settings & Navigation State
  const [settings, setSettings] = useState<PresentationSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('simply_ppt_settings');
        if (saved) return JSON.parse(saved);
      } catch {
        // Ignore
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [activeTab, setActiveTab] = useState<'recent' | 'history'>('recent');

  // Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isPairedDevicesOpen, setIsPairedDevicesOpen] = useState(false);
  const [isTestControllerOpen, setIsTestControllerOpen] = useState(false);

  // Cloud Connection Status
  const [cloudMode] = useState<'supabase' | 'local'>(() =>
    isSupabaseConfigured() ? 'supabase' : 'local'
  );
  const [isConnected, setIsConnected] = useState(true);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);

  // 1. Initial Load: Load local DB presentations & settings
  const refreshLibrary = useCallback(() => {
    Promise.all([getAllPresentations(), getPresentationHistory()])
      .then(([stored, hist]) => {
        setPresentations(stored);
        setHistory(hist);
      })
      .catch((err) => {
        console.warn('Local storage not initialized yet:', err);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getAllPresentations(), getPresentationHistory()])
      .then(([stored, hist]) => {
        if (isMounted) {
          setPresentations(stored);
          setHistory(hist);
        }
      })
      .catch((err) => {
        console.warn('Local storage not initialized yet:', err);
      });

    // Check Cloud connection
    pairingService.testConnection().then((res) => {
      if (isMounted) {
        setIsConnected(res.connected);
        setLatencyMs(res.latencyMs);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleSaveSettings(newSettings: PresentationSettings) {
    setSettings(newSettings);
    try {
      localStorage.setItem('simply_ppt_settings', JSON.stringify(newSettings));
    } catch {
      // Ignore
    }
  }

  // 2. Start Presentation Mode
  async function handleStartPresentation(pres: StoredPresentation) {
    setActivePresentation(pres);

    // Create cloud pairing session
    try {
      const sess = await pairingService.createSession(pres.name, pres.slideCount);
      setActiveSession(sess);

      // Subscribe to pairing requests
      pairingService.subscribeToPairingRequests(sess.id, (req) => {
        setPendingRequest(req);
      });
    } catch (err) {
      console.error('Failed to create pairing session:', err);
    }
  }

  // 3. Exit Presentation Mode
  async function handleExitPresentation(slidesPresented: number, durationSeconds: number) {
    if (activePresentation) {
      try {
        await recordPresentationSession({
          presentationId: activePresentation.id,
          presentationName: activePresentation.name,
          startedAt: Date.now() - durationSeconds * 1000,
          endedAt: Date.now(),
          durationSeconds,
          slidesPresented,
          pairedDeviceCount: pairedDevices.filter((d) => d.isActive).length,
        });
      } catch (err) {
        console.warn('Failed to log presentation history:', err);
      }
    }

    setActivePresentation(null);
    setActiveSession(null);
    setPairedDevices([]);
    setPendingRequest(null);
    refreshLibrary();
  }

  // 4. Delete Presentation
  async function handleDeletePresentation(id: string) {
    await deletePresentation(id);
    refreshLibrary();
  }

  // 5. Pairing Handlers
  async function handleRefreshPairCode() {
    if (!activeSession) return;
    const res = await pairingService.refreshPairCode(activeSession.id);
    setActiveSession({
      ...activeSession,
      pairCode: res.pairCode,
      expiresAt: res.expiresAt,
    });
  }

  async function handleApproveRequest(requestId: string) {
    const approved = await pairingService.approveRequest(requestId);
    if (approved) {
      setPairedDevices((prev) => [...prev, approved]);
    }
    setPendingRequest(null);
  }

  async function handleRejectRequest(requestId: string) {
    await pairingService.rejectRequest(requestId);
    setPendingRequest(null);
  }

  async function handleRevokeDevice(deviceId: string) {
    if (!activeSession) return;
    await pairingService.revokeDevice(activeSession.id, deviceId);
    setPairedDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
  }

  // If currently presenting, mount full presentation view
  if (activePresentation) {
    return (
      <main className="min-h-screen bg-black">
        <PresentationViewer
          presentation={activePresentation}
          settings={settings}
          session={activeSession}
          onExit={handleExitPresentation}
          onOpenPairing={() => setIsPairingOpen(true)}
        />

        {/* Pairing Code Modal */}
        <PairingModal
          isOpen={isPairingOpen}
          onClose={() => setIsPairingOpen(false)}
          pairCode={activeSession?.pairCode || '------'}
          expiresAt={activeSession?.expiresAt || new Date().toISOString()}
          onRefreshCode={handleRefreshPairCode}
        />

        {/* Device Approval Dialog */}
        <ApprovalDialog
          request={pendingRequest}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
        />

        {/* Paired Devices Drawer */}
        <PairedDevicesDrawer
          isOpen={isPairedDevicesOpen}
          onClose={() => setIsPairedDevicesOpen(false)}
          devices={pairedDevices}
          onRevokeDevice={handleRevokeDevice}
          onOpenPairingModal={() => {
            setIsPairedDevicesOpen(false);
            setIsPairingOpen(true);
          }}
        />

        {/* Mobile Test Controller Simulator */}
        <TestController
          isOpen={isTestControllerOpen}
          onClose={() => setIsTestControllerOpen(false)}
          currentSlide={1}
          totalSlides={activePresentation.slideCount}
          activeSessionId={activeSession?.id}
          onSendCommand={(type, payload) => {
            if (activeSession) {
              pairingService.broadcastCommand(activeSession.id, {
                id: `cmd_${Date.now()}`,
                type: type as CommandType,
                sessionId: activeSession.id,
                timestamp: Date.now(),
                payload,
              });
            }
          }}
        />
      </main>
    );
  }

  // Otherwise, display Dashboard
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col bg-violet-glow">
      <Navbar
        cloudMode={cloudMode}
        isConnected={isConnected}
        latencyMs={latencyMs}
        pairedDeviceCount={pairedDevices.filter((d) => d.isActive).length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPairedDevices={() => setIsPairedDevicesOpen(true)}
        onOpenTestController={() => setIsTestControllerOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-10">
        {/* Top Hero / Quick Upload */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-800/40 text-violet-300 text-xs font-medium mb-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Desktop-First Presentation Control</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Ready to deliver your presentation?
              </h1>
              <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                Drop your PDF deck below. Documents stay 100% private on your machine while mobile devices pair seamlessly across networks.
              </p>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <UploadDropzone
            onPresentationReady={(pres) => {
              refreshLibrary();
              handleStartPresentation(pres);
            }}
          />
        </section>

        {/* Dashboard Tabs & Content */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex items-center gap-2 text-sm font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'recent'
                    ? 'border-violet-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-4 h-4 text-violet-400" />
                Recent Presentations
                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                  {presentations.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 text-sm font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'history'
                    ? 'border-violet-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <History className="w-4 h-4 text-indigo-400" />
                Session History
                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                  {history.length}
                </span>
              </button>
            </div>
          </div>

          {activeTab === 'recent' ? (
            <RecentPresentations
              presentations={presentations}
              onSelect={handleStartPresentation}
              onDelete={handleDeletePresentation}
            />
          ) : (
            <PresentationHistory history={history} />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 px-6 text-center text-xs text-zinc-500 flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto w-full">
        <p>Simply PPT &copy; 2026. A smarter way to present.</p>
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <span className="flex items-center gap-1 text-zinc-400">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            100% Local File Storage
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1 text-zinc-400">
            <Smartphone className="w-3.5 h-3.5 text-violet-400" />
            Cross-Network Cloud Signaling
          </span>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        cloudMode={cloudMode}
      />

      {/* Paired Devices Modal */}
      <PairedDevicesDrawer
        isOpen={isPairedDevicesOpen}
        onClose={() => setIsPairedDevicesOpen(false)}
        devices={pairedDevices}
        onRevokeDevice={handleRevokeDevice}
        onOpenPairingModal={() => {
          setIsPairedDevicesOpen(false);
          setIsPairingOpen(true);
        }}
      />

      {/* Test Controller Simulator */}
      <TestController
        isOpen={isTestControllerOpen}
        onClose={() => setIsTestControllerOpen(false)}
        currentSlide={1}
        totalSlides={presentations[0]?.slideCount || 10}
        activeSessionId={activeSession?.id}
        onSendCommand={(type, payload) => {
          if (activeSession) {
            pairingService.broadcastCommand(activeSession.id, {
              id: `cmd_${Date.now()}`,
              type: type as CommandType,
              sessionId: activeSession.id,
              timestamp: Date.now(),
              payload,
            });
          }
        }}
      />
    </div>
  );
}
