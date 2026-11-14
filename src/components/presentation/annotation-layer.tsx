'use client';

import React, { useRef, useEffect } from 'react';
import { DrawPayload, HighlightPayload } from '@/lib/protocol/types';

export interface AnnotationLayerProps {
  width: number;
  height: number;
  drawings: DrawPayload[];
  highlights: HighlightPayload[];
}

export function AnnotationLayer({ width, height, drawings, highlights }: AnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset and clear
    ctx.clearRect(0, 0, width, height);

    // 1. Render Highlights first (semi-transparent)
    highlights.forEach((h) => {
      if (h.points.length < 2) return;
      ctx.save();
      ctx.globalAlpha = h.opacity ?? 0.4;
      ctx.strokeStyle = h.color;
      ctx.lineWidth = h.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(h.points[0].x * width, h.points[0].y * height);
      for (let i = 1; i < h.points.length; i++) {
        ctx.lineTo(h.points[i].x * width, h.points[i].y * height);
      }
      ctx.stroke();
      ctx.restore();
    });

    // 2. Render Drawings (solid strokes)
    drawings.forEach((d) => {
      if (d.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(d.points[0].x * width, d.points[0].y * height);
      for (let i = 1; i < d.points.length; i++) {
        ctx.lineTo(d.points[i].x * width, d.points[i].y * height);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [width, height, drawings, highlights]);

  if (width <= 0 || height <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 z-30"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
}
