'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoredPresentation } from '@/lib/storage/db';
import { loadPDFDocument, PDFDocumentProxyWrapper } from '@/lib/pdf/engine';
import { PresentationSettings } from '@/lib/presentation/types';
import {
  canGoNext,
  canGoPrevious,
  getNextSlide,
  getPreviousSlide,
  clampSlide,
} from '@/lib/presentation/navigation';
import { HudOverlay } from './hud-overlay';
import { SlideJumpModal } from './slide-jump-modal';
import { AnnotationLayer } from './annotation-layer';
import { LaserPointer } from './laser-pointer';
import {
  DrawPayload,
  HighlightPayload,
  LaserPointerPayload,
  ZoomPayload,
  ProtocolMessage,
} from '@/lib/protocol/types';
import { pairingService, PresentationSession } from '@/lib/supabase/service';

export interface PresentationViewerProps {
  presentation: StoredPresentation;
  settings: PresentationSettings;
  session: PresentationSession | null;
  onExit: (slidesViewed: number, durationSeconds: number) => void;
  onOpenPairing: () => void;
}

export function PresentationViewer({
  presentation,
  settings,
  session,
  onExit,
  onOpenPairing,
}: PresentationViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [docProxy, setDocProxy] = useState<PDFDocumentProxyWrapper | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const [isWhiteout, setIsWhiteout] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Mobile controller overlays
  const [laser, setLaser] = useState<LaserPointerPayload>({ x: 0.5, y: 0.5, visible: false });
  const [annotations, setAnnotations] = useState<
    Map<number, { drawings: DrawPayload[]; highlights: HighlightPayload[] }>
  >(new Map());
  const [zoom, setZoom] = useState<ZoomPayload>({ scale: 1, originX: 0.5, originY: 0.5 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxSlideReached = useRef(1);
  const docProxyRef = useRef<PDFDocumentProxyWrapper | null>(null);

  const totalSlides = presentation.slideCount || 1;

  // 1. Load PDF document
  useEffect(() => {
    let active = true;
    loadPDFDocument(presentation.pdfData)
      .then((proxy) => {
        if (active) {
          docProxyRef.current = proxy;
          setDocProxy(proxy);
        } else {
          proxy.destroy();
        }
      })
      .catch((err) => {
        console.error('Failed to load PDF document for presentation:', err);
      });

    return () => {
      active = false;
      if (docProxyRef.current) {
        docProxyRef.current.destroy();
        docProxyRef.current = null;
      }
    };
  }, [presentation.pdfData]);

  // 2. Presentation session duration timer
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // 3. Render current page to canvas on slide change
  const renderCurrentPage = useCallback(async () => {
    if (!docProxy || !canvasRef.current || !containerRef.current) return;

    try {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const renderedDims = await docProxy.renderPageToCanvas(
        currentSlide,
        canvasRef.current,
        settings.scaleMode,
        containerWidth,
        containerHeight
      );

      setCanvasDimensions(renderedDims);
    } catch (err) {
      console.error('Failed rendering slide page:', err);
    }
  }, [docProxy, currentSlide, settings.scaleMode]);

  useEffect(() => {
    renderCurrentPage();

    // Broadcast state to paired mobile devices
    if (session) {
      pairingService.broadcastPresentationState(session.id, {
        currentSlide,
        totalSlides,
        isPresenting: true,
        title: presentation.name,
        backgroundColor: settings.backgroundColor,
        scaleMode: settings.scaleMode,
      });
    }

    maxSlideReached.current = Math.max(maxSlideReached.current, currentSlide);
  }, [currentSlide, renderCurrentPage, session, totalSlides, presentation.name, settings]);

  // Re-render when window resizes
  useEffect(() => {
    function handleResize() {
      renderCurrentPage();
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCurrentPage]);

  // 4. Slide navigation handlers
  const handleNext = useCallback(() => {
    if (canGoNext(currentSlide, totalSlides)) {
      setCurrentSlide(getNextSlide(currentSlide, totalSlides));
    }
  }, [currentSlide, totalSlides]);

  const handlePrevious = useCallback(() => {
    if (canGoPrevious(currentSlide)) {
      setCurrentSlide(getPreviousSlide(currentSlide));
    }
  }, [currentSlide]);

  const handleGoToSlide = useCallback(
    (slideNumber: number) => {
      setCurrentSlide(clampSlide(slideNumber, totalSlides));
    },
    [totalSlides]
  );

  // 5. Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  // 6. Keyboard navigation listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if an input is focused (e.g. jump dialog)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'Enter':
        case 'n':
        case 'N':
          e.preventDefault();
          handleNext();
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
        case 'p':
        case 'P':
          if (e.key === 'p' || e.key === 'P') {
            // Check if holding Shift for pairing, otherwise previous
            if (e.shiftKey) {
              e.preventDefault();
              onOpenPairing();
            } else {
              e.preventDefault();
              handlePrevious();
            }
          } else {
            e.preventDefault();
            handlePrevious();
          }
          break;

        case 'Home':
          e.preventDefault();
          handleGoToSlide(1);
          break;

        case 'End':
          e.preventDefault();
          handleGoToSlide(totalSlides);
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'b':
        case 'B':
          e.preventDefault();
          setIsBlackout((prev) => !prev);
          break;

        case 'w':
        case 'W':
          e.preventDefault();
          setIsWhiteout((prev) => !prev);
          break;

        case 'g':
        case 'G':
          e.preventDefault();
          setIsJumpOpen(true);
          break;

        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
          } else {
            onExit(maxSlideReached.current, durationSeconds);
          }
          break;

        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleGoToSlide, toggleFullscreen, totalSlides, onOpenPairing, onExit, durationSeconds]);

  // 7. Auto-hiding HUD logic
  const handleMouseMove = useCallback(() => {
    setShowHud(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setShowHud(false);
    }, settings.autoHideHudDelay);
  }, [settings.autoHideHudDelay]);

  // 8. Remote Supabase commands listener
  useEffect(() => {
    if (!session) return;

    const unsubscribe = pairingService.subscribeToCommands(session.id, (msg: ProtocolMessage) => {
      switch (msg.type) {
        case 'NEXT_SLIDE':
          handleNext();
          break;

        case 'PREVIOUS_SLIDE':
          handlePrevious();
          break;

        case 'GO_TO_SLIDE': {
          const payload = msg.payload as { slideNumber: number };
          if (payload?.slideNumber) {
            handleGoToSlide(payload.slideNumber);
          }
          break;
        }

        case 'DRAW': {
          const payload = msg.payload as DrawPayload;
          setAnnotations((prev) => {
            const next = new Map(prev);
            const current = next.get(currentSlide) || { drawings: [], highlights: [] };
            next.set(currentSlide, {
              ...current,
              drawings: [...current.drawings, payload],
            });
            return next;
          });
          break;
        }

        case 'HIGHLIGHT': {
          const payload = msg.payload as HighlightPayload;
          setAnnotations((prev) => {
            const next = new Map(prev);
            const current = next.get(currentSlide) || { drawings: [], highlights: [] };
            next.set(currentSlide, {
              ...current,
              highlights: [...current.highlights, payload],
            });
            return next;
          });
          break;
        }

        case 'LASER_POINTER': {
          const payload = msg.payload as LaserPointerPayload;
          setLaser(payload);
          break;
        }

        case 'ZOOM': {
          const payload = msg.payload as ZoomPayload;
          setZoom(payload);
          break;
        }

        case 'CLEAR_ANNOTATION': {
          const payload = msg.payload as { slideNumber?: number };
          const target = payload?.slideNumber || currentSlide;
          setAnnotations((prev) => {
            const next = new Map(prev);
            next.delete(target);
            return next;
          });
          break;
        }

        case 'BLACKOUT': {
          const p = msg.payload as { enabled?: boolean };
          setIsBlackout((prev) => (p?.enabled !== undefined ? p.enabled : !prev));
          setIsWhiteout(false);
          break;
        }

        case 'WHITEOUT': {
          const p = msg.payload as { enabled?: boolean };
          setIsWhiteout((prev) => (p?.enabled !== undefined ? p.enabled : !prev));
          setIsBlackout(false);
          break;
        }

        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [session, currentSlide, handleNext, handlePrevious, handleGoToSlide]);

  const currentAnnotation = annotations.get(currentSlide) || { drawings: [], highlights: [] };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{ backgroundColor: settings.backgroundColor }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden select-none cursor-default"
    >
      {/* Blackout and Whiteout Shading Overlays */}
      {isBlackout && <div className="absolute inset-0 bg-black z-40 transition-opacity duration-200" />}
      {isWhiteout && <div className="absolute inset-0 bg-white z-40 transition-opacity duration-200" />}

      {/* Presentation Stage Canvas Container */}
      <div
        key={currentSlide}
        className={`relative flex items-center justify-center transition-transform duration-150 ${
          settings.transitionEffect === 'fade'
            ? 'animate-in fade-in duration-200'
            : settings.transitionEffect === 'slide'
            ? 'animate-in slide-in-from-right-4 duration-150'
            : ''
        }`}
        style={{
          transform: `scale(${zoom.scale})`,
          transformOrigin: `${zoom.originX * 100}% ${zoom.originY * 100}%`,
        }}
      >
        <canvas ref={canvasRef} className="shadow-2xl" />

        {/* Vector Annotation Layer */}
        <AnnotationLayer
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          drawings={currentAnnotation.drawings}
          highlights={currentAnnotation.highlights}
        />

        {/* Virtual Laser Pointer */}
        <LaserPointer laser={laser} />
      </div>

      {/* Auto-Hiding Clean HUD Overlay */}
      <HudOverlay
        isVisible={showHud}
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        durationSeconds={durationSeconds}
        isFullscreen={isFullscreen}
        isBlackout={isBlackout}
        isWhiteout={isWhiteout}
        pairCode={session?.pairCode}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToggleFullscreen={toggleFullscreen}
        onToggleBlackout={() => setIsBlackout((p) => !p)}
        onToggleWhiteout={() => setIsWhiteout((p) => !p)}
        onOpenPairing={onOpenPairing}
        onOpenJump={() => setIsJumpOpen(true)}
        onExit={() => onExit(maxSlideReached.current, durationSeconds)}
      />

      {/* Slide Jump Modal Dialog */}
      <SlideJumpModal
        isOpen={isJumpOpen}
        onClose={() => setIsJumpOpen(false)}
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        onJumpToSlide={handleGoToSlide}
      />
    </div>
  );
}
