'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Hash } from 'lucide-react';

export interface SlideJumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlide: number;
  totalSlides: number;
  onJumpToSlide: (slideNumber: number) => void;
}

export function SlideJumpModal({
  isOpen,
  onClose,
  currentSlide,
  totalSlides,
  onJumpToSlide,
}: SlideJumpModalProps) {
  const [slideInput, setSlideInput] = useState(currentSlide.toString());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(slideInput, 10);
    if (!isNaN(num) && num >= 1 && num <= totalSlides) {
      onJumpToSlide(num);
      onClose();
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Jump to Slide"
      description={`Enter a slide number between 1 and ${totalSlides}.`}
      maxWidth="max-w-xs"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="number"
            min={1}
            max={totalSlides}
            value={slideInput}
            autoFocus
            onChange={(e) => setSlideInput(e.target.value)}
            className="w-full text-center text-3xl font-bold font-mono py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            <Hash className="w-4 h-4 mr-1" />
            Go
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
