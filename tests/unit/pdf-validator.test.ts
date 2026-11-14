import { describe, it, expect } from 'vitest';
import { validatePDFFile, validatePDFBuffer } from '@/lib/pdf/validator';

describe('PDF Validator (Unit)', () => {
  it('validates a correct PDF buffer with %PDF- header', () => {
    const validHeader = new TextEncoder().encode('%PDF-1.7\n%abc');
    const result = validatePDFBuffer(validHeader.buffer);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects a buffer with invalid magic bytes', () => {
    const invalidHeader = new TextEncoder().encode('PNG\r\n');
    const result = validatePDFBuffer(invalidHeader.buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid PDF magic bytes');
  });

  it('rejects a buffer that is too small', () => {
    const tiny = new Uint8Array([1, 2]);
    const result = validatePDFBuffer(tiny.buffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Buffer is too small');
  });

  it('validates a valid File object with %PDF- header', async () => {
    const content = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj');
    const file = new File([content], 'my-pitch-deck.pdf', { type: 'application/pdf' });
    const result = await validatePDFFile(file);
    expect(result.valid).toBe(true);
    expect(result.fileName).toBe('my-pitch-deck.pdf');
    expect(result.fileSize).toBe(content.byteLength);
  });

  it('rejects a non-PDF file extension', async () => {
    const file = new File(['hello'], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const result = await validatePDFFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Please upload a presentation in PDF format');
  });

  it('rejects an empty file (0 bytes)', async () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' });
    const result = await validatePDFFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty (0 bytes)');
  });

  it('rejects a file exceeding the size limit', async () => {
    // Mock a large file
    const fakeLargeFile = {
      name: 'huge.pdf',
      type: 'application/pdf',
      size: 150 * 1024 * 1024, // 150MB
      slice: () => ({
        arrayBuffer: async () => new TextEncoder().encode('%PDF-').buffer,
      }),
    } as unknown as File;

    const result = await validatePDFFile(fakeLargeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds the 100MB limit');
  });
});
