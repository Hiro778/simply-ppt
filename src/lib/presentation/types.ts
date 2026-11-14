import { DrawPayload, HighlightPayload } from '../protocol/types';

export type ScaleMode = 'contain' | 'fit-width' | 'original';
export type TransitionEffect = 'cut' | 'fade' | 'slide';

export interface SlideAnnotation {
  drawings: DrawPayload[];
  highlights: HighlightPayload[];
}

export interface PresentationSettings {
  backgroundColor: string;
  scaleMode: ScaleMode;
  transitionEffect: TransitionEffect;
  autoHideHudDelay: number;
}

export const DEFAULT_SETTINGS: PresentationSettings = {
  backgroundColor: '#000000',
  scaleMode: 'contain',
  transitionEffect: 'cut',
  autoHideHudDelay: 2500,
};
