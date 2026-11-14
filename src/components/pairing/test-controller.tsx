'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Hash,
  PenTool,
  Highlighter,
  Target,
  Trash2,
  Mic,
  ZoomIn,
  CheckCircle2,
  Unplug,
} from 'lucide-react';
import { MobileMode } from '@/lib/protocol/types';
import { parseVoiceCommand } from '@/lib/protocol/validator';
import { pairingService } from '@/lib/supabase/service';

export interface TestControllerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlide: number;
  totalSlides: number;
  activeSessionId?: string;
  onSendCommand: (type: string, payload: unknown) => void;
}

export function TestController({
  isOpen,
  onClose,
  currentSlide,
  totalSlides,
  activeSessionId,
  onSendCommand,
}: TestControllerProps) {
  const [mode, setMode] = useState<MobileMode>('remote');
  const [pairCodeInput, setPairCodeInput] = useState('');
  const [deviceName, setDeviceName] = useState('Hiro’s Virtual Phone');
  const [deviceId] = useState('sim_virtual_controller');
  const [isPaired, setIsPaired] = useState(false);
  const [pairStatus, setPairStatus] = useState<string | null>(null);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [jumpSlideInput, setJumpSlideInput] = useState('');

  async function handleSimulatePairing() {
    if (!pairCodeInput.trim()) {
      setPairStatus('Please enter the 6-digit pair code from the screen.');
      return;
    }

    setPairStatus('Submitting pairing request to host...');
    const res = await pairingService.submitPairingRequest(pairCodeInput.trim(), deviceId, deviceName);

    if (!res.success) {
      setPairStatus(`Error: ${res.error}`);
      return;
    }

    setPairStatus('Request submitted! Please approve this request on the desktop host.');
    setIsPaired(true);
  }

  function handleVoiceCommand(phrase: string) {
    const parsed = parseVoiceCommand(phrase);
    if (parsed.recognized && parsed.commandType) {
      if (parsed.commandType === 'NEXT_SLIDE') {
        onSendCommand('NEXT_SLIDE', {});
        setVoiceFeedback(`Recognized: "${phrase}" → NEXT_SLIDE`);
      } else if (parsed.commandType === 'PREVIOUS_SLIDE') {
        onSendCommand('PREVIOUS_SLIDE', {});
        setVoiceFeedback(`Recognized: "${phrase}" → PREVIOUS_SLIDE`);
      } else if (parsed.commandType === 'GO_TO_SLIDE' && parsed.slideNumber) {
        onSendCommand('GO_TO_SLIDE', { slideNumber: parsed.slideNumber });
        setVoiceFeedback(`Recognized: "${phrase}" → GO_TO_SLIDE (${parsed.slideNumber})`);
      }
    } else {
      setVoiceFeedback(`Unrecognized voice command: "${phrase}". Speak Only mode supports strictly: "Lanjut slide", "Slide sebelumnya", and "Slide [number]".`);
    }
  }

  function sendLaser(x: number, y: number, visible: boolean) {
    onSendCommand('LASER_POINTER', { x, y, visible });
  }

  function sendDraw() {
    onSendCommand('DRAW', {
      points: [
        { x: 0.25, y: 0.3 },
        { x: 0.35, y: 0.38 },
        { x: 0.45, y: 0.28 },
      ],
      color: '#e11d48',
      strokeWidth: 4,
    });
  }

  function sendHighlight() {
    onSendCommand('HIGHLIGHT', {
      points: [
        { x: 0.2, y: 0.5 },
        { x: 0.8, y: 0.5 },
      ],
      color: '#facc15',
      strokeWidth: 20,
      opacity: 0.4,
    });
  }

  function handleDisconnect() {
    setIsPaired(false);
    setPairStatus(null);
    if (activeSessionId) {
      pairingService.revokeDevice(activeSessionId, deviceId);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Mobile Controller Simulator (Phase 2 Preview)"
      description="Test remote slide navigation, annotations, laser pointer, and voice commands."
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Pairing Simulation Box */}
        {!isPaired ? (
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Simulate Mobile Pairing
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="6-digit Pair Code"
                value={pairCodeInput}
                maxLength={6}
                onChange={(e) => setPairCodeInput(e.target.value.replace(/\D/g, ''))}
                className="w-36 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-violet-500"
              />
              <input
                type="text"
                placeholder="Device Name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
              <Button variant="primary" size="sm" onClick={handleSimulatePairing}>
                Connect
              </Button>
            </div>
            {pairStatus && (
              <p className="text-xs text-violet-300 font-medium">{pairStatus}</p>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Simulating: <strong>{deviceName}</strong></span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-xs text-red-400 hover:text-red-300 py-1 px-2 h-auto"
            >
              <Unplug className="w-3 h-3 mr-1" />
              Disconnect
            </Button>
          </div>
        )}

        {/* 4 Mobile Modes Switcher */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
          <button
            onClick={() => setMode('remote')}
            className={`py-1.5 rounded-lg font-medium transition-colors ${
              mode === 'remote' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1. Remote
          </button>
          <button
            onClick={() => setMode('annotation')}
            className={`py-1.5 rounded-lg font-medium transition-colors ${
              mode === 'annotation' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            2. Annotate
          </button>
          <button
            onClick={() => setMode('presenter')}
            className={`py-1.5 rounded-lg font-medium transition-colors ${
              mode === 'presenter' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3. Presenter
          </button>
          <button
            onClick={() => setMode('speak_only')}
            className={`py-1.5 rounded-lg font-medium transition-colors ${
              mode === 'speak_only' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            4. Speak Only
          </button>
        </div>

        {/* Mode 1: Remote Controller */}
        {mode === 'remote' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => onSendCommand('PREVIOUS_SLIDE', {})}
                className="py-6 text-sm flex flex-col items-center justify-center gap-1 hover:border-violet-500"
              >
                <ChevronLeft className="w-6 h-6" />
                Previous Slide
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => onSendCommand('NEXT_SLIDE', {})}
                className="py-6 text-sm flex flex-col items-center justify-center gap-1"
              >
                <ChevronRight className="w-6 h-6" />
                Next Slide
              </Button>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={totalSlides}
                placeholder={`Jump (1 - ${totalSlides})`}
                value={jumpSlideInput}
                onChange={(e) => setJumpSlideInput(e.target.value)}
                className="w-36 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const num = parseInt(jumpSlideInput, 10);
                  if (!isNaN(num)) {
                    onSendCommand('GO_TO_SLIDE', { slideNumber: num });
                    setJumpSlideInput('');
                  }
                }}
                className="text-xs"
              >
                <Hash className="w-3.5 h-3.5 mr-1" />
                Go to Slide
              </Button>
            </div>
          </div>
        )}

        {/* Mode 2: Annotation */}
        {mode === 'annotation' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Transmit live vector strokes and highlights to the desktop display canvas:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" size="sm" onClick={sendDraw} className="text-xs">
                <PenTool className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                Simulate Pen
              </Button>
              <Button variant="secondary" size="sm" onClick={sendHighlight} className="text-xs">
                <Highlighter className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Simulate Highlight
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onSendCommand('CLEAR_ANNOTATION', { slideNumber: currentSlide })}
                className="text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Mode 3: Presenter */}
        {mode === 'presenter' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Interactive touchpad to steer the desktop virtual laser dot:
            </p>
            <div
              className="w-full h-36 rounded-xl bg-zinc-950 border border-zinc-800 relative cursor-crosshair overflow-hidden flex items-center justify-center"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                sendLaser(x, y, true);
              }}
              onMouseLeave={() => sendLaser(0.5, 0.5, false)}
            >
              <div className="text-center pointer-events-none text-zinc-600 text-xs">
                <Target className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <span>Move mouse here to direct virtual laser</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSendCommand('ZOOM', { scale: 1.5, originX: 0.5, originY: 0.5 })}
                className="text-xs flex-1"
              >
                <ZoomIn className="w-3.5 h-3.5 mr-1" />
                Zoom 1.5x Center
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendCommand('ZOOM', { scale: 1.0, originX: 0.5, originY: 0.5 })}
                className="text-xs flex-1"
              >
                Reset Zoom
              </Button>
            </div>
          </div>
        )}

        {/* Mode 4: Speak Only */}
        {mode === 'speak_only' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-800/40 text-xs text-zinc-300">
              <p className="font-semibold text-violet-300 mb-1 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-violet-400" />
                Strict Indonesian Voice Commands (Phase 2 Spec)
              </p>
              <p className="text-zinc-400">
                Click any of the three supported phrases below to simulate mobile voice dispatch:
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => handleVoiceCommand('Lanjut slide')}
                className="w-full justify-start text-xs font-mono"
              >
                &quot;Lanjut slide&quot; → NEXT_SLIDE
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={() => handleVoiceCommand('Slide sebelumnya')}
                className="w-full justify-start text-xs font-mono"
              >
                &quot;Slide sebelumnya&quot; → PREVIOUS_SLIDE
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={() => handleVoiceCommand(`Slide ${Math.min(totalSlides, currentSlide + 1)}`)}
                className="w-full justify-start text-xs font-mono"
              >
                &quot;Slide {Math.min(totalSlides, currentSlide + 1)}&quot; → GO_TO_SLIDE
              </Button>
            </div>

            {voiceFeedback && (
              <p className="text-xs text-indigo-300 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                {voiceFeedback}
              </p>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
