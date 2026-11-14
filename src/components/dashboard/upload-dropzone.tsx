'use client';

import React, { useState, useRef, DragEvent } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { validatePDFFile } from '@/lib/pdf/validator';
import { loadPDFDocument } from '@/lib/pdf/engine';
import { savePresentation, StoredPresentation } from '@/lib/storage/db';

export interface UploadDropzoneProps {
  onPresentationReady: (presentation: StoredPresentation) => void;
}

export function UploadDropzone({ onPresentationReady }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setErrorMessage(null);
    setIsLoading(true);
    setStatusMessage('Validating PDF format & headers...');

    try {
      // 1. Magic bytes & size validation
      const validation = await validatePDFFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid PDF file.');
        setIsLoading(false);
        return;
      }

      setStatusMessage('Inspecting presentation pages...');
      const buffer = await file.arrayBuffer();

      // 2. Parse pages & generate thumbnail using PDF.js
      let doc;
      try {
        doc = await loadPDFDocument(buffer);
      } catch (err) {
        setErrorMessage(
          `Unable to parse PDF document. The file might be corrupted, password-protected, or incomplete (${err instanceof Error ? err.message : 'Unknown error'}).`
        );
        setIsLoading(false);
        return;
      }

      const totalSlides = doc.numPages;
      if (totalSlides < 1) {
        setErrorMessage('The presentation contains no slides.');
        setIsLoading(false);
        doc.destroy();
        return;
      }

      setStatusMessage(`Rendering preview for ${totalSlides} slides...`);
      let thumbnail = '';
      try {
        thumbnail = await doc.generateThumbnail(1, 360);
      } catch {
        // Thumbnail generation is non-blocking
      }
      doc.destroy();

      setStatusMessage('Saving to local offline library...');
      const presentationId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pres_${Date.now()}`;
      const stored = await savePresentation(
        presentationId,
        file.name,
        file.size,
        totalSlides,
        buffer,
        thumbnail
      );

      setStatusMessage('Presentation ready!');
      onPresentationReady(stored);
    } catch (err) {
      setErrorMessage(`Processing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  }

  return (
    <div className="w-full">
      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          isDragging
            ? 'border-violet-500 bg-violet-950/20 shadow-xl shadow-violet-900/20 scale-[1.01]'
            : 'border-zinc-800 hover:border-violet-500/50 bg-zinc-900/40 hover:bg-zinc-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${
              isDragging
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/40'
                : 'bg-zinc-800/80 text-violet-400 group-hover:bg-violet-600/20 group-hover:text-violet-300'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1.5">
            <h4 className="text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors">
              {isLoading ? 'Processing presentation...' : 'Drop your presentation PDF here'}
            </h4>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              {isLoading
                ? statusMessage
                : 'Drag and drop any PDF presentation slide deck, or click to browse local files.'}
            </p>
          </div>

          {!isLoading && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Select PDF File
              </Button>
            </div>
          )}
        </div>

        {/* Canva Support Banner Note */}
        <div className="mt-8 pt-4 border-t border-zinc-800/60 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>
            Presenting from Canva? Export your slides as <strong>PDF Standard</strong> or <strong>PDF Print</strong> and drop the file here.
          </span>
        </div>
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-3 text-red-300 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-200">Import Failed</p>
            <p className="text-xs text-red-300/90 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
