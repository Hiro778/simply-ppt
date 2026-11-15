import { describe, it, expect } from 'vitest';
import { validateProtocolMessage, parseVoiceCommand } from '@/lib/protocol/validator';
import { ProtocolMessage } from '@/lib/protocol/types';

describe('Protocol & Command Validator (Unit)', () => {
  it('validates NEXT_SLIDE command', () => {
    const raw: ProtocolMessage = {
      id: 'msg-1',
      type: 'NEXT_SLIDE',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: {},
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('validates PREVIOUS_SLIDE command', () => {
    const raw: ProtocolMessage = {
      id: 'msg-2',
      type: 'PREVIOUS_SLIDE',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: {},
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('validates GO_TO_SLIDE command with valid positive slide number', () => {
    const raw: ProtocolMessage = {
      id: 'msg-3',
      type: 'GO_TO_SLIDE',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: { slideNumber: 5 },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('rejects GO_TO_SLIDE command with invalid slide number', () => {
    const raw: ProtocolMessage = {
      id: 'msg-4',
      type: 'GO_TO_SLIDE',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: { slideNumber: 0 },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(false);
  });

  it('validates DRAW command with normalized coordinates and valid hex color', () => {
    const raw: ProtocolMessage = {
      id: 'msg-5',
      type: 'DRAW',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: {
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.5, y: 0.6 },
        ],
        color: '#ff0000',
        strokeWidth: 3,
      },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('rejects DRAW command with unnormalized coordinates (> 1.0)', () => {
    const raw = {
      id: 'msg-6',
      type: 'DRAW',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: {
        points: [{ x: 1.5, y: 0.2 }],
        color: '#ff0000',
        strokeWidth: 3,
      },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(false);
  });

  it('validates LASER_POINTER command', () => {
    const raw: ProtocolMessage = {
      id: 'msg-7',
      type: 'LASER_POINTER',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: { x: 0.45, y: 0.72, visible: true },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('validates ZOOM command within allowed zoom bounds [1, 5]', () => {
    const raw: ProtocolMessage = {
      id: 'msg-8',
      type: 'ZOOM',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: { scale: 2.5, originX: 0.5, originY: 0.5 },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('validates CLEAR_ANNOTATION command', () => {
    const raw: ProtocolMessage = {
      id: 'msg-9',
      type: 'CLEAR_ANNOTATION',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: { slideNumber: 3 },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('validates BLACKOUT command', () => {
    const raw: ProtocolMessage = {
      id: 'msg-9b',
      type: 'BLACKOUT',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: { enabled: true },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('validates WHITEOUT command', () => {
    const raw: ProtocolMessage = {
      id: 'msg-9w',
      type: 'WHITEOUT',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: { enabled: true },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('validates PRESENTATION_STATE broadcast message', () => {
    const raw: ProtocolMessage = {
      id: 'msg-10',
      type: 'PRESENTATION_STATE',
      sessionId: 'sess-123',
      timestamp: Date.now(),
      payload: {
        currentSlide: 2,
        totalSlides: 15,
        isPresenting: true,
        title: 'Pitch.pdf',
        scaleMode: 'contain',
      },
    };
    const res = validateProtocolMessage(raw);
    expect(res.success).toBe(true);
  });

  it('rejects an invalid protocol envelope', () => {
    const invalid = { foo: 'bar' };
    const res = validateProtocolMessage(invalid);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid protocol envelope');
  });

  describe('Speak Only Indonesian Voice Command Parser', () => {
    it('correctly maps "Lanjut slide" to NEXT_SLIDE', () => {
      const res = parseVoiceCommand('Lanjut slide');
      expect(res.recognized).toBe(true);
      expect(res.commandType).toBe('NEXT_SLIDE');

      // Case insensitive
      expect(parseVoiceCommand('lanjut slide').commandType).toBe('NEXT_SLIDE');
    });

    it('correctly maps "Slide sebelumnya" to PREVIOUS_SLIDE', () => {
      const res = parseVoiceCommand('Slide sebelumnya');
      expect(res.recognized).toBe(true);
      expect(res.commandType).toBe('PREVIOUS_SLIDE');
    });

    it('correctly maps "Slide [number]" to GO_TO_SLIDE', () => {
      const res = parseVoiceCommand('Slide 12');
      expect(res.recognized).toBe(true);
      expect(res.commandType).toBe('GO_TO_SLIDE');
      expect(res.slideNumber).toBe(12);
    });

    it('strictly rejects any other voice commands', () => {
      expect(parseVoiceCommand('Next slide').recognized).toBe(false);
      expect(parseVoiceCommand('Previous').recognized).toBe(false);
      expect(parseVoiceCommand('Tutup presentasi').recognized).toBe(false);
      expect(parseVoiceCommand('Lompat').recognized).toBe(false);
    });
  });
});
