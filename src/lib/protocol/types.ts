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
  'PRESENTATION_STATE',
  'DEVICE_CONNECTED',
  'DEVICE_DISCONNECTED',
]);
export type CommandType = z.infer<typeof CommandTypeEnum>;

// Normalized point (0.0 to 1.0) relative to presentation canvas
export const PointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type Point = z.infer<typeof PointSchema>;

// Schemas for payloads
export const NextSlidePayloadSchema = z.object({}).strict().optional().default({});
export type NextSlidePayload = z.infer<typeof NextSlidePayloadSchema>;

export const PreviousSlidePayloadSchema = z.object({}).strict().optional().default({});
export type PreviousSlidePayload = z.infer<typeof PreviousSlidePayloadSchema>;

export const GoToSlidePayloadSchema = z.object({
  slideNumber: z.number().int().min(1),
});
export type GoToSlidePayload = z.infer<typeof GoToSlidePayloadSchema>;

export const DrawPayloadSchema = z.object({
  points: z.array(PointSchema).min(1),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/, 'Invalid hex color'),
  strokeWidth: z.number().positive().max(50),
});
export type DrawPayload = z.infer<typeof DrawPayloadSchema>;

export const HighlightPayloadSchema = z.object({
  points: z.array(PointSchema).min(1),
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
  slideNumber: z.number().int().positive().optional(),
});
export type ClearAnnotationPayload = z.infer<typeof ClearAnnotationPayloadSchema>;

export const PresentationStatePayloadSchema = z.object({
  currentSlide: z.number().int().min(1),
  totalSlides: z.number().int().min(0),
  isPresenting: z.boolean(),
  title: z.string(),
  backgroundColor: z.string().optional(),
  scaleMode: z.enum(['contain', 'fit-width', 'original']).optional(),
});
export type PresentationStatePayload = z.infer<typeof PresentationStatePayloadSchema>;

export const DeviceConnectedPayloadSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  mode: MobileModeEnum.optional().default('remote'),
});
export type DeviceConnectedPayload = z.infer<typeof DeviceConnectedPayloadSchema>;

export const DeviceDisconnectedPayloadSchema = z.object({
  deviceId: z.string().min(1),
  reason: z.string().optional(),
});
export type DeviceDisconnectedPayload = z.infer<typeof DeviceDisconnectedPayloadSchema>;

// Generic Protocol Message Envelope
export const ProtocolMessageSchema = z.object({
  id: z.string().min(1),
  type: CommandTypeEnum,
  sessionId: z.string().min(1),
  deviceToken: z.string().optional(),
  timestamp: z.number().positive(),
  payload: z.unknown(),
});
export type ProtocolMessage = z.infer<typeof ProtocolMessageSchema>;

// Indonesian voice command constants for Speak Only mode
export const VOICE_COMMANDS = {
  NEXT_SLIDE: 'Lanjut slide',
  PREVIOUS_SLIDE: 'Slide sebelumnya',
  GO_TO_SLIDE_PREFIX: 'Slide ',
} as const;
