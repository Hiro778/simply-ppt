import {
  CommandType,
  DrawPayloadSchema,
  GoToSlidePayloadSchema,
  HighlightPayloadSchema,
  LaserPointerPayloadSchema,
  NextSlidePayloadSchema,
  PreviousSlidePayloadSchema,
  ZoomPayloadSchema,
  ClearAnnotationPayloadSchema,
  PresentationStatePayloadSchema,
  DeviceConnectedPayloadSchema,
  DeviceDisconnectedPayloadSchema,
  ProtocolMessage,
  ProtocolMessageSchema,
  VOICE_COMMANDS,
} from './types';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates any incoming protocol command message and its specific payload
 */
export function validateProtocolMessage(raw: unknown): ValidationResult<ProtocolMessage> {
  const envelopeResult = ProtocolMessageSchema.safeParse(raw);
  if (!envelopeResult.success) {
    return {
      success: false,
      error: `Invalid protocol envelope: ${envelopeResult.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  const msg = envelopeResult.data;

  switch (msg.type) {
    case 'NEXT_SLIDE': {
      const res = NextSlidePayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'PREVIOUS_SLIDE': {
      const res = PreviousSlidePayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'GO_TO_SLIDE': {
      const res = GoToSlidePayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'DRAW': {
      const res = DrawPayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'HIGHLIGHT': {
      const res = HighlightPayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'LASER_POINTER': {
      const res = LaserPointerPayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'ZOOM': {
      const res = ZoomPayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'CLEAR_ANNOTATION': {
      const res = ClearAnnotationPayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'PRESENTATION_STATE': {
      const res = PresentationStatePayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'DEVICE_CONNECTED': {
      const res = DeviceConnectedPayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    case 'DEVICE_DISCONNECTED': {
      const res = DeviceDisconnectedPayloadSchema.safeParse(msg.payload);
      return res.success ? { success: true, data: { ...msg, payload: res.data } } : { success: false, error: res.error.message };
    }
    default: {
      return {
        success: false,
        error: `Unsupported command type: ${msg.type}`,
      };
    }
  }
}

/**
 * Parses spoken text for Speak Only mode into a standardized command.
 * Strictly supports only the 3 specified Indonesian commands:
 * 1. "Lanjut slide" -> NEXT_SLIDE
 * 2. "Slide sebelumnya" -> PREVIOUS_SLIDE
 * 3. "Slide [number]" -> GO_TO_SLIDE
 */
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
