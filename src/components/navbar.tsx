'use client';

import React from 'react';
import { Presentation, Smartphone, Settings, WifiOff, Laptop } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface NavbarProps {
  cloudMode: 'supabase' | 'local';
  isConnected: boolean;
  latencyMs?: number;
  pairedDeviceCount: number;
  onOpenSettings: () => void;
  onOpenPairedDevices: () => void;
  onOpenTestController: () => void;
}

export function Navbar({
  cloudMode,
  isConnected,
  latencyMs,
  pairedDeviceCount,
  onOpenSettings,
  onOpenPairedDevices,
  onOpenTestController,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-zinc-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-600/30 border border-violet-400/30">
          <Presentation className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Simply PPT
            </span>
            <Badge variant="violet" className="text-[10px] tracking-wide uppercase py-0.5 px-2">
              Phase 1 Desktop
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 font-normal">A smarter way to present.</p>
        </div>
      </div>

      {/* Right Actions & Status Badges */}
      <div className="flex items-center gap-3">
        {/* Connection Status Indicator */}
        <div
          onClick={onOpenSettings}
          className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all text-xs"
          title="Click to view cloud connection settings"
        >
          {cloudMode === 'supabase' ? (
            isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-zinc-300 font-medium group-hover:text-white">Cloud Active</span>
                {latencyMs !== undefined && (
                  <span className="text-[11px] text-zinc-500">({latencyMs}ms)</span>
                )}
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 font-medium">Cloud Disconnected</span>
              </>
            )
          ) : (
            <>
              <Laptop className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-300 font-medium group-hover:text-white">Local / Offline</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Ready</span>
            </>
          )}
        </div>

        {/* Paired Devices Button */}
        <Button
          variant="glass"
          size="sm"
          onClick={onOpenPairedDevices}
          className="relative text-xs font-medium"
        >
          <Smartphone className="w-3.5 h-3.5 text-violet-400 mr-1.5" />
          Paired Devices
          {pairedDeviceCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-violet-600 text-white text-[10px] font-semibold">
              {pairedDeviceCount}
            </span>
          )}
        </Button>

        {/* Integrated Mobile Simulator */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenTestController}
          className="text-xs font-medium hover:border-violet-500/50"
          title="Simulate remote controller without a physical phone"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
          Simulator
        </Button>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="text-zinc-400 hover:text-zinc-100"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
