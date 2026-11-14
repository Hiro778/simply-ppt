'use client';

import React from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Smartphone, Unplug } from 'lucide-react';
import { PairedDevice } from '@/lib/supabase/service';

export interface PairedDevicesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  devices: PairedDevice[];
  onRevokeDevice: (deviceId: string) => void;
  onOpenPairingModal: () => void;
}

export function PairedDevicesDrawer({
  isOpen,
  onClose,
  devices,
  onRevokeDevice,
  onOpenPairingModal,
}: PairedDevicesDrawerProps) {
  const activeDevices = devices.filter((d) => d.isActive);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Paired Remote Controllers"
      description="Manage mobile devices approved to control this presentation."
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {activeDevices.length === 0 ? (
          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
            <Smartphone className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-medium text-zinc-300">No devices connected</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Pair your smartphone or tablet using a 6-digit code to control slides wirelessly.
            </p>
            <Button variant="primary" size="sm" onClick={onOpenPairingModal} className="mt-2">
              Generate Pair Code
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeDevices.map((device) => (
              <div
                key={device.id}
                className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/20">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{device.deviceName}</span>
                      <Badge variant="success" className="text-[10px] py-0 px-1.5">
                        Active
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Paired at {new Date(device.pairedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevokeDevice(device.deviceId)}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  title="Revoke session and disconnect device"
                >
                  <Unplug className="w-3.5 h-3.5 mr-1" />
                  Disconnect
                </Button>
              </div>
            ))}
          </div>
        )}

        {activeDevices.length > 0 && (
          <div className="pt-2 flex justify-between items-center border-t border-zinc-800">
            <Button variant="secondary" size="sm" onClick={onOpenPairingModal} className="text-xs">
              Pair Another Device
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
