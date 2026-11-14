// Dynamic PDF.js loader for browser client

export interface PDFSlideDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface PDFDocumentProxyWrapper {
  numPages: number;
  getPageDimensions: (pageNumber: number) => Promise<PDFSlideDimensions>;
  renderPageToCanvas: (
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scaleMode?: 'contain' | 'fit-width' | 'original',
    containerWidth?: number,
    containerHeight?: number
  ) => Promise<{ width: number; height: number }>;
  generateThumbnail: (pageNumber?: number, maxWidth?: number) => Promise<string>;
  destroy: () => void;
}

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be initialized in the browser.');
  }

  if (!pdfjsLib) {
    const pdfjs = await import('pdfjs-dist');
    // Configure worker
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    pdfjsLib = pdfjs;
  }
  return pdfjsLib;
}

/**
 * Loads a PDF document from an ArrayBuffer without blocking the main thread
 */
export async function loadPDFDocument(data: ArrayBuffer): Promise<PDFDocumentProxyWrapper> {
  const pdfjs = await getPdfJs();
  // Copy buffer to prevent detached buffer errors
  const copy = data.slice(0);
  const loadingTask = pdfjs.getDocument({
    data: copy,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
    cMapPacked: true,
    stopAtErrors: true,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  return {
    numPages,

    async getPageDimensions(pageNumber: number): Promise<PDFSlideDimensions> {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });
      return {
        width: viewport.width,
        height: viewport.height,
        aspectRatio: viewport.width / viewport.height,
      };
    },

    async renderPageToCanvas(
      pageNumber: number,
      canvas: HTMLCanvasElement,
      scaleMode: 'contain' | 'fit-width' | 'original' = 'contain',
      containerWidth?: number,
      containerHeight?: number
    ): Promise<{ width: number; height: number }> {
      const page = await pdfDoc.getPage(pageNumber);
      const originalViewport = page.getViewport({ scale: 1.0 });
      const origWidth = originalViewport.width;
      const origHeight = originalViewport.height;

      const availWidth = containerWidth || window.innerWidth;
      const availHeight = containerHeight || window.innerHeight;

      let scale = 1.0;
      if (scaleMode === 'contain') {
        const scaleX = availWidth / origWidth;
        const scaleY = availHeight / origHeight;
        scale = Math.min(scaleX, scaleY);
      } else if (scaleMode === 'fit-width') {
        scale = availWidth / origWidth;
      } else {
        scale = 1.0;
      }

      // High-DPI crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      // @ts-expect-error pdfjs typing nuance
      await page.render(renderContext).promise;

      return {
        width: Math.floor(viewport.width / dpr),
        height: Math.floor(viewport.height / dpr),
      };
    },

    async generateThumbnail(pageNumber = 1, maxWidth = 320): Promise<string> {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.0 });
      const scale = maxWidth / viewport.width;
      const thumbViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = thumbViewport.width;
      canvas.height = thumbViewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // @ts-expect-error pdfjs typing nuance
      await page.render({ canvasContext: ctx, viewport: thumbViewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.85);
    },

    destroy() {
      try {
        const doc = pdfDoc as unknown as { destroy?: () => void; cleanup?: () => void };
        if (typeof doc.destroy === 'function') {
          doc.destroy();
        } else if (typeof doc.cleanup === 'function') {
          doc.cleanup();
        }
      } catch {
        // Ignore destroy error
      }
    },
  };
}
