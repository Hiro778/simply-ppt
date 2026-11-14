'use client';

import React from 'react';
import { LaserPointerPayload } from '@/lib/protocol/types';

export interface LaserPointerProps {
  laser: LaserPointerPayload;
}

export function LaserPointer({ laser }: LaserPointerProps) {
  if (!laser.visible) return null;

  return (
    <div
      className="pointer-events-none absolute z-40 transition-all duration-75 ease-out"
      style={{
        left: `${laser.x * 100}%`,
        top: `${laser.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="w-5 h-5 rounded-full bg-red-500 laser-glow flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>
    </div>
  );
}
