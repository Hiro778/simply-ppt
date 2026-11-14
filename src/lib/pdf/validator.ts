export interface PDFValidationResult {
  valid: boolean;
  error?: string;
  fileSize?: number;
  fileName?: string;
}

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit

/**
 * Validates a file as a legitimate PDF:
 * 1. Checks file extension and MIME type.
 * 2. Inspects magic bytes (%PDF-).
 * 3. Enforces reasonable file size bounds.
 */
export async function validatePDFFile(file: File): Promise<PDFValidationResult> {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // 1. Extension & MIME check
  const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  const isPdfMime = file.type === 'application/pdf' || file.type === '';
  if (!isPdfExtension && !isPdfMime) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a presentation in PDF format (.pdf).',
      fileName: file.name,
      fileSize: file.size,
    };
  }

  // 2. Size check
  if (file.size === 0) {
    return {
      valid: false,
      error: 'The uploaded file is empty (0 bytes).',
      fileName: file.name,
      fileSize: file.size,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 100MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      fileName: file.name,
      fileSize: file.size,
    };
  }

  // 3. Magic number check (%PDF-)
  try {
    const slice = file.slice(0, 5);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes);

    if (header !== '%PDF-') {
      return {
        valid: false,
        error: 'Invalid PDF format: file header does not match %PDF- magic bytes.',
        fileName: file.name,
        fileSize: file.size,
      };
    }
  } catch (err) {
    return {
      valid: false,
      error: `Failed to inspect file header: ${err instanceof Error ? err.message : 'Unknown error'}`,
      fileName: file.name,
      fileSize: file.size,
    };
  }

  return {
    valid: true,
    fileName: file.name,
    fileSize: file.size,
  };
}

/**
 * Validates a raw ArrayBuffer or Uint8Array as PDF magic bytes
 */
export function validatePDFBuffer(buffer: ArrayBuffer | Uint8Array): PDFValidationResult {
  const bytes = buffer instanceof Uint8Array ? buffer.slice(0, 5) : new Uint8Array(buffer, 0, Math.min(5, buffer.byteLength));
  if (bytes.length < 5) {
    return { valid: false, error: 'Buffer is too small to be a PDF.' };
  }

  const header = String.fromCharCode(...bytes);
  if (header !== '%PDF-') {
    return { valid: false, error: 'Invalid PDF magic bytes: expected %PDF-.' };
  }

  return { valid: true };
}
