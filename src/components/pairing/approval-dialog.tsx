'use client';

import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Smartphone, ShieldAlert, Check, X } from 'lucide-react';
import { PairingRequest } from '@/lib/supabase/service';

export interface ApprovalDialogProps {
  request: PairingRequest | null;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export function ApprovalDialog({ request, onApprove, onReject }: ApprovalDialogProps) {
  if (!request) return null;

  return (
    <Dialog
      isOpen={Boolean(request)}
      onClose={() => onReject(request.id)}
      title="Pairing Request Received"
      description="A mobile device is requesting remote control access for this presentation."
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-700/40 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600/30 flex items-center justify-center text-violet-300 shrink-0 border border-violet-500/30">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-base">{request.deviceName}</h4>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Device ID: {request.deviceId.slice(0, 16)}...</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Requested at {new Date(request.requestedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Only approve devices you trust. Once approved, this device will be able to advance slides, point the virtual laser, and draw annotations.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            size="md"
            onClick={() => onReject(request.id)}
            className="text-zinc-400 hover:text-red-400"
          >
            <X className="w-4 h-4 mr-1.5" />
            Decline
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onApprove(request.id)}
            className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40 shadow-emerald-900/30"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Approve Device
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
