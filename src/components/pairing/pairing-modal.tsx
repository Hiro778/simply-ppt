'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Clock, RefreshCw, ShieldCheck, Wifi } from 'lucide-react';
import { getRemainingSeconds } from '@/lib/pairing/code-generator';

export interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairCode: string;
  expiresAt: string;
  onRefreshCode: () => void;
}

export function PairingModal({
  isOpen,
  onClose,
  pairCode,
  expiresAt,
  onRefreshCode,
}: PairingModalProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    expiresAt ? getRemainingSeconds(expiresAt) : 0
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen || !expiresAt) return;

    const interval = setInterval(() => {
      const rem = getRemainingSeconds(expiresAt);
      setRemainingSeconds(rem);
      if (rem <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, expiresAt]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await onRefreshCode();
    setIsRefreshing(false);
  }

  const isExpired = remainingSeconds <= 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Pair Mobile Remote Controller"
      description="Connect your smartphone to control slides, point laser, and annotate from anywhere."
      maxWidth="max-w-md"
    >
      <div className="space-y-6 text-center">
        {/* Pairing Code Card */}
        <div className="p-6 rounded-2xl bg-zinc-950/70 border border-violet-500/30 shadow-xl shadow-violet-950/20 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500" />

          <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-3">
            Six-Digit Pairing Code
          </p>

          {/* Large digits */}
          <div className="flex items-center justify-center gap-2 text-3xl md:text-4xl font-mono font-bold tracking-widest text-violet-300">
            {isExpired ? (
              <span className="text-zinc-500 line-through">EXPIRED</span>
            ) : (
              pairCode.split('').map((digit, i) => (
                <span
                  key={i}
                  className="w-10 h-14 rounded-xl bg-zinc-900 border border-violet-500/40 flex items-center justify-center text-white shadow-inner"
                >
                  {digit}
                </span>
              ))
            )}
          </div>

          {/* Expiration Timer Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs">
            <Clock
              className={`w-3.5 h-3.5 ${
                isExpired ? 'text-red-400' : remainingSeconds < 30 ? 'text-amber-400 animate-pulse' : 'text-zinc-400'
              }`}
            />
            <span
              className={
                isExpired
                  ? 'text-red-400 font-medium'
                  : remainingSeconds < 30
                  ? 'text-amber-400 font-medium'
                  : 'text-zinc-400'
              }
            >
              {isExpired ? 'Code has expired' : `Code expires in ${timerDisplay}`}
            </span>
          </div>
        </div>

        {/* Refresh Code Button */}
        <div className="flex items-center justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Generate New Code
          </Button>
        </div>

        {/* Security & Feature Highlights */}
        <div className="text-left space-y-2 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400">
          <div className="flex items-start gap-2">
            <Wifi className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
            <span>
              <strong>Cross-Network:</strong> Works across mobile cellular (4G/5G) or separate Wi-Fi networks.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Host Approval:</strong> When entered on phone, you will be prompted to approve the device.
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
