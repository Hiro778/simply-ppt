import {
  parseVoiceCommand,
  PointSchema,
  DrawPayloadSchema,
  HighlightPayloadSchema,
  LaserPointerPayloadSchema,
  ZoomPayloadSchema,
  GoToSlidePayloadSchema,
  VOICE_COMMANDS,
} from '../src/lib/protocol';
import { sha256Pure, hashPairCode, hashRequesterSecret } from '../src/lib/crypto';
import { voiceRecognizer } from '../src/lib/voice-recognizer';

describe('Simply PPT Mobile — Unit Test Suite', () => {
  describe('Pair Code & Crypto Hashing', () => {
    it('generates consistent SHA-256 hashes for pair codes', async () => {
      const hash1 = await hashPairCode('123456');
      const hash2 = await hashPairCode('123456');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('generates different hashes for distinct pair codes', async () => {
      const hashA = await hashPairCode('123456');
      const hashB = await hashPairCode('654321');
      expect(hashA).not.toBe(hashB);
    });

    it('correctly hashes requester secret for host approval polling', async () => {
      const secret = 'test-secret-value-12345';
      const hash = await hashRequesterSecret(secret);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe('Indonesian Voice Command Parser (Speak Only Mode)', () => {
    it('correctly recognizes Command 1: "Lanjut slide" -> NEXT_SLIDE', () => {
      const res = parseVoiceCommand('Lanjut slide');
      expect(res.recognized).toBe(true);
      expect(res.commandType).toBe('NEXT_SLIDE');
    });

    it('correctly recognizes Command 1 with varied casing and whitespace', () => {
      const res = parseVoiceCommand('  LANJUT SLIDE   ');
      expect(res.recognized).toBe(true);
      expect(res.commandType).toBe('NEXT_SLIDE');
    });

    it('correctly recognizes Command 2: "Slide sebelumnya" -> PREVIOUS_SLIDE', () => {
      const res = parseVoiceCommand('Slide sebelumnya');
      expect(res.recognized).toBe(true);
      expect(res.commandType).toBe('PREVIOUS_SLIDE');
    });

    it('correctly recognizes Command 3: "Slide [number]" -> GO_TO_SLIDE', () => {
      const res5 = parseVoiceCommand('Slide 5');
      expect(res5.recognized).toBe(true);
      expect(res5.commandType).toBe('GO_TO_SLIDE');
      expect(res5.slideNumber).toBe(5);

      const res12 = parseVoiceCommand('slide 12');
      expect(res12.recognized).toBe(true);
      expect(res12.commandType).toBe('GO_TO_SLIDE');
      expect(res12.slideNumber).toBe(12);
    });

    it('strictly rejects any unauthorized commands', () => {
      expect(parseVoiceCommand('zoom in').recognized).toBe(false);
      expect(parseVoiceCommand('gambar garis').recognized).toBe(false);
      expect(parseVoiceCommand('pause presentation').recognized).toBe(false);
      expect(parseVoiceCommand('halo google').recognized).toBe(false);
      expect(parseVoiceCommand('next please').recognized).toBe(false);
      expect(parseVoiceCommand('slide').recognized).toBe(false);
      expect(parseVoiceCommand('slide nol').recognized).toBe(false);
      expect(parseVoiceCommand('slide -3').recognized).toBe(false);
    });
  });

  describe('Duplicate-Command Suppression', () => {
    it('suppresses immediate duplicate voice commands within debounce window', () => {
      const first = voiceRecognizer.processTranscript('Lanjut slide');
      expect(first.recognized).toBe(true);
      expect(first.commandType).toBe('NEXT_SLIDE');

      // Immediate second trigger within debounce window
      const second = voiceRecognizer.processTranscript('Lanjut slide');
      expect(second.recognized).toBe(false);
      expect(second.message).toContain('duplikat');
    });
  });

  describe('Protocol Schema & Coordinate Normalization', () => {
    it('validates normalized Point coordinates between 0.0 and 1.0', () => {
      expect(PointSchema.safeParse({ x: 0.0, y: 0.0 }).success).toBe(true);
      expect(PointSchema.safeParse({ x: 0.542, y: 0.812 }).success).toBe(true);
      expect(PointSchema.safeParse({ x: 1.0, y: 1.0 }).success).toBe(true);

      // Rejects unnormalized coordinates
      expect(PointSchema.safeParse({ x: 1.05, y: 0.5 }).success).toBe(false);
      expect(PointSchema.safeParse({ x: -0.1, y: 0.5 }).success).toBe(false);
    });

    it('validates DRAW payload with hex colors and stroke bounds', () => {
      const valid = DrawPayloadSchema.safeParse({
        points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
        color: '#e11d48',
        strokeWidth: 4,
      });
      expect(valid.success).toBe(true);

      // Rejects invalid hex color
      const invalidColor = DrawPayloadSchema.safeParse({
        points: [{ x: 0.1, y: 0.2 }],
        color: 'red',
        strokeWidth: 4,
      });
      expect(invalidColor.success).toBe(false);
    });

    it('validates HIGHLIGHT payload opacity bounds', () => {
      const valid = HighlightPayloadSchema.safeParse({
        points: [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }],
        color: '#facc15',
        strokeWidth: 16,
        opacity: 0.4,
      });
      expect(valid.success).toBe(true);
    });

    it('validates LASER_POINTER coordinates and visibility', () => {
      const valid = LaserPointerPayloadSchema.safeParse({
        x: 0.45,
        y: 0.65,
        visible: true,
      });
      expect(valid.success).toBe(true);
    });

    it('validates ZOOM bounds between 1.0x and 5.0x', () => {
      expect(ZoomPayloadSchema.safeParse({ scale: 2.5, originX: 0.5, originY: 0.5 }).success).toBe(true);
      expect(ZoomPayloadSchema.safeParse({ scale: 0.5, originX: 0.5, originY: 0.5 }).success).toBe(false);
      expect(ZoomPayloadSchema.safeParse({ scale: 6.0, originX: 0.5, originY: 0.5 }).success).toBe(false);
    });

    it('validates GO_TO_SLIDE positive integer numbers', () => {
      expect(GoToSlidePayloadSchema.safeParse({ slideNumber: 1 }).success).toBe(true);
      expect(GoToSlidePayloadSchema.safeParse({ slideNumber: 42 }).success).toBe(true);
      expect(GoToSlidePayloadSchema.safeParse({ slideNumber: 0 }).success).toBe(false);
      expect(GoToSlidePayloadSchema.safeParse({ slideNumber: -5 }).success).toBe(false);
    });
  });
});
