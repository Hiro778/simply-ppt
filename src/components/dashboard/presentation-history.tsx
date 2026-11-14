'use client';

import React from 'react';
import { History, Smartphone, Calendar, Clock, Layers } from 'lucide-react';
import { PresentationHistoryItem } from '@/lib/storage/db';
import { formatDuration } from '@/lib/presentation/navigation';

export interface PresentationHistoryProps {
  history: PresentationHistoryItem[];
}

export function PresentationHistory({ history }: PresentationHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-800/60 flex items-center justify-center text-zinc-500 mb-3">
          <History className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-zinc-300">No presentation sessions logged</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Completed presentation sessions and remote controller statistics will automatically appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800/80">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Presentation</th>
              <th scope="col" className="px-5 py-3 font-semibold">Date & Time</th>
              <th scope="col" className="px-5 py-3 font-semibold">Duration</th>
              <th scope="col" className="px-5 py-3 font-semibold">Slides</th>
              <th scope="col" className="px-5 py-3 font-semibold">Controllers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-5 py-3.5 font-medium text-white flex items-center gap-2">
                  <span className="line-clamp-1">{item.presentationName}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{new Date(item.startedAt).toLocaleDateString()}</span>
                    <span className="text-zinc-600">at</span>
                    <span>{new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{item.durationSeconds ? formatDuration(item.durationSeconds) : '< 1m'}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{item.slidesPresented} slides</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-violet-400" />
                    <span>{item.pairedDeviceCount} paired</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
