'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Smartphone,
  Clock,
  Moon,
  Sun,
  Hash,
} from 'lucide-react';
import { Button } from '../ui/button';
import { formatSlideCounter, formatDuration } from '@/lib/presentation/navigation';

export interface HudOverlayProps {
  isVisible: boolean;
  currentSlide: number;
  totalSlides: number;
  durationSeconds: number;
  isFullscreen: boolean;
  isBlackout: boolean;
  isWhiteout: boolean;
  pairCode?: string;
  onPrevious: () => void;
  onNext: () => void;
  onToggleFullscreen: () => void;
  onToggleBlackout: () => void;
  onToggleWhiteout: () => void;
  onOpenPairing: () => void;
  onOpenJump: () => void;
  onExit: () => void;
}

export function HudOverlay({
  isVisible,
  currentSlide,
  totalSlides,
  durationSeconds,
  isFullscreen,
  isBlackout,
  isWhiteout,
  pairCode,
  onPrevious,
  onNext,
  onToggleFullscreen,
  onToggleBlackout,
  onToggleWhiteout,
  onOpenPairing,
  onOpenJump,
  onExit,
}: HudOverlayProps) {
  return (
    <div
      className={`fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="pointer-events-auto glass-panel-glow px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl border border-zinc-700/60 bg-zinc-950/80 backdrop-blur-xl">
        {/* Navigation Arrows */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            disabled={currentSlide <= 1}
            className="w-8 h-8 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30"
            title="Previous Slide (← / PageUp)"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Slide Counter / Jump button */}
          <button
            onClick={onOpenJump}
            className="px-2.5 py-1 rounded-lg hover:bg-zinc-800/80 text-xs font-mono font-medium text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Click or press 'G' to jump to specific slide"
          >
            <span>{formatSlideCounter(currentSlide, totalSlides)}</span>
            <Hash className="w-3 h-3 text-zinc-500" />
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={currentSlide >= totalSlides}
            className="w-8 h-8 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30"
            title="Next Slide (→ / Space / PageDown)"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="h-5 w-px bg-zinc-800" />

        {/* Presentation Timer */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>{formatDuration(durationSeconds)}</span>
        </div>

        <div className="h-5 w-px bg-zinc-800" />

        {/* Screen Shading Controls (Blackout / Whiteout) */}
        <div className="flex items-center gap-1">
          <Button
            variant={isBlackout ? 'primary' : 'ghost'}
            size="icon"
            onClick={onToggleBlackout}
            className={`w-8 h-8 rounded-lg ${isBlackout ? 'bg-violet-600' : 'text-zinc-400 hover:text-white'}`}
            title="Toggle Black Screen (B)"
          >
            <Moon className="w-4 h-4" />
          </Button>
          <Button
            variant={isWhiteout ? 'primary' : 'ghost'}
            size="icon"
            onClick={onToggleWhiteout}
            className={`w-8 h-8 rounded-lg ${isWhiteout ? 'bg-zinc-200 text-black' : 'text-zinc-400 hover:text-white'}`}
            title="Toggle White Screen (W)"
          >
            <Sun className="w-4 h-4" />
          </Button>
        </div>

        <div className="h-5 w-px bg-zinc-800" />

        {/* Pair Mobile Quick Pill */}
        <Button
          variant="glass"
          size="sm"
          onClick={onOpenPairing}
          className="text-xs h-8 px-2.5 rounded-lg border-violet-500/40 text-violet-300 hover:bg-violet-950/40"
          title="Pair Mobile Remote (P)"
        >
          <Smartphone className="w-3.5 h-3.5 mr-1 text-violet-400" />
          <span>Pair</span>
          {pairCode && <span className="font-mono ml-1 text-white font-bold">{pairCode}</span>}
        </Button>

        {/* Fullscreen Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white"
          title={isFullscreen ? 'Exit Fullscreen (F / Esc)' : 'Enter Fullscreen (F)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>

        {/* Exit Presentation */}
        <Button
          variant="danger"
          size="icon"
          onClick={onExit}
          className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300"
          title="Exit Presentation Mode (Esc)"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
