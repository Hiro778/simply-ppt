import { z } from 'zod';

export const MobileModeEnum = z.enum([
  'remote',
  'annotation',
  'presenter',
  'speak_only',
]);
export type MobileMode = z.infer<typeof MobileModeEnum>;

export const CommandTypeEnum = z.enum([
  'NEXT_SLIDE',
  'PREVIOUS_SLIDE',
  'GO_TO_SLIDE',
  'DRAW',
  'HIGHLIGHT',
  'LASER_POINTER',
  'ZOOM',
  'CLEAR_ANNOTATION',
  'BLACKOUT',
  'WHITEOUT',
  'PRESENTATION_STATE',
  'DEVICE_CONNECTED',
  'DEVICE_DISCONNECTED',
]);
export type CommandType = z.infer<typeof CommandTypeEnum>;

// Normalized coordinate point (0.0 to 1.0)
export const PointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type Point = z.infer<typeof PointSchema>;

export const NextSlidePayloadSchema = z.object({}).strict().optional().default({});
export type NextSlidePayload = z.infer<typeof NextSlidePayloadSchema>;

export const PreviousSlidePayloadSchema = z.object({}).strict().optional().default({});
export type PreviousSlidePayload = z.infer<typeof PreviousSlidePayloadSchema>;

export const GoToSlidePayloadSchema = z.object({
  slideNumber: z.number().int().min(1).max(10000),
});
export type GoToSlidePayload = z.infer<typeof GoToSlidePayloadSchema>;

export const DrawPayloadSchema = z.object({
  points: z.array(PointSchema).min(1).max(1000),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/, 'Invalid hex color'),
  strokeWidth: z.number().positive().max(50),
});
export type DrawPayload = z.infer<typeof DrawPayloadSchema>;

export const HighlightPayloadSchema = z.object({
  points: z.array(PointSchema).min(1).max(1000),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/, 'Invalid hex color'),
  strokeWidth: z.number().positive().max(100),
  opacity: z.number().min(0.05).max(1).optional().default(0.4),
});
export type HighlightPayload = z.infer<typeof HighlightPayloadSchema>;

export const LaserPointerPayloadSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  visible: z.boolean(),
});
export type LaserPointerPayload = z.infer<typeof LaserPointerPayloadSchema>;

export const ZoomPayloadSchema = z.object({
  scale: z.number().min(1).max(5),
  originX: z.number().min(0).max(1),
  originY: z.number().min(0).max(1),
});
export type ZoomPayload = z.infer<typeof ZoomPayloadSchema>;

export const ClearAnnotationPayloadSchema = z.object({
  slideNumber: z.number().int().positive().max(10000).optional(),
});
export type ClearAnnotationPayload = z.infer<typeof ClearAnnotationPayloadSchema>;

export const BlackoutPayloadSchema = z.object({
  enabled: z.boolean().optional(),
}).strict().optional().default({});
export type BlackoutPayload = z.infer<typeof BlackoutPayloadSchema>;

export const WhiteoutPayloadSchema = z.object({
  enabled: z.boolean().optional(),
}).strict().optional().default({});
export type WhiteoutPayload = z.infer<typeof WhiteoutPayloadSchema>;

export const PresentationStatePayloadSchema = z.object({
  currentSlide: z.number().int().min(1).max(10000),
  totalSlides: z.number().int().min(0).max(10000),
  isPresenting: z.boolean(),
  title: z.string().max(256),
  backgroundColor: z.string().max(32).optional(),
  scaleMode: z.enum(['contain', 'fit-width', 'original']).optional(),
  notes: z.string().optional(),
});
export type PresentationStatePayload = z.infer<typeof PresentationStatePayloadSchema>;

export const DeviceConnectedPayloadSchema = z.object({
  deviceId: z.string().min(1).max(128),
  deviceName: z.string().min(1).max(100),
  mode: MobileModeEnum.optional().default('remote'),
});
export type DeviceConnectedPayload = z.infer<typeof DeviceConnectedPayloadSchema>;

export const DeviceDisconnectedPayloadSchema = z.object({
  deviceId: z.string().min(1).max(128),
  reason: z.string().max(256).optional(),
});
export type DeviceDisconnectedPayload = z.infer<typeof DeviceDisconnectedPayloadSchema>;

export const ProtocolMessageSchema = z.object({
  id: z.string().min(1).max(128),
  type: CommandTypeEnum,
  sessionId: z.string().min(1).max(128),
  deviceToken: z.string().max(128).optional(),
  timestamp: z.number().positive(),
  payload: z.unknown(),
});
export type ProtocolMessage = z.infer<typeof ProtocolMessageSchema>;

export const VOICE_COMMANDS = {
  NEXT_SLIDE: 'Lanjut slide',
  PREVIOUS_SLIDE: 'Slide sebelumnya',
  GO_TO_SLIDE_PREFIX: 'Slide ',
} as const;

export function parseVoiceCommand(transcript: string): {
  recognized: boolean;
  commandType?: CommandType;
  slideNumber?: number;
} {
  const normalized = transcript.trim().toLowerCase();

  if (normalized === VOICE_COMMANDS.NEXT_SLIDE.toLowerCase()) {
    return { recognized: true, commandType: 'NEXT_SLIDE' };
  }

  if (normalized === VOICE_COMMANDS.PREVIOUS_SLIDE.toLowerCase()) {
    return { recognized: true, commandType: 'PREVIOUS_SLIDE' };
  }

  const prefix = VOICE_COMMANDS.GO_TO_SLIDE_PREFIX.toLowerCase();
  if (normalized.startsWith(prefix)) {
    const rawNumber = normalized.substring(prefix.length).trim();
    const num = parseInt(rawNumber, 10);
    if (!isNaN(num) && num > 0) {
      return { recognized: true, commandType: 'GO_TO_SLIDE', slideNumber: num };
    }
  }

  return { recognized: false };
}
