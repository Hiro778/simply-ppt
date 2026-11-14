'use client';

import React from 'react';
import { Play, Trash2, Clock, Layers, HardDrive, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { StoredPresentation } from '@/lib/storage/db';

export interface RecentPresentationsProps {
  presentations: StoredPresentation[];
  onSelect: (presentation: StoredPresentation) => void;
  onDelete: (id: string) => void;
}

export function RecentPresentations({ presentations, onSelect, onDelete }: RecentPresentationsProps) {
  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatTimestamp(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (presentations.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-800/60 flex items-center justify-center text-zinc-500 mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-zinc-300">No presentations saved yet</h4>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Uploaded presentations are safely saved in your browser&apos;s local storage for instant offline access.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {presentations.map((p) => (
        <div
          key={p.id}
          className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-violet-500/40 transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          {/* Top Preview Canvas/Thumbnail */}
          <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden flex items-center justify-center border-b border-zinc-800/60">
            {p.thumbnail && (p.thumbnail.startsWith('data:image/') || p.thumbnail.startsWith('blob:')) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.thumbnail}
                alt={p.name}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-600 gap-2">
                <FileText className="w-8 h-8" />
                <span className="text-xs font-mono">Slide 1</span>
              </div>
            )}

            {/* Quick Play Overlay Button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="primary"
                size="md"
                onClick={() => onSelect(p)}
                className="shadow-xl"
              >
                <Play className="w-4 h-4 mr-1.5 fill-current" />
                Present
              </Button>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <h5
                className="text-sm font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors line-clamp-1"
                title={p.name}
              >
                {p.name}
              </h5>

              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                <div className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{p.slideCount} slides</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{formatSize(p.size)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{formatTimestamp(p.lastOpenedAt)}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSelect(p)}
                className="text-xs w-full mr-2"
              >
                <Play className="w-3 h-3 mr-1.5 fill-current" />
                Present Now
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(p.id);
                }}
                className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                title="Remove from local library"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
