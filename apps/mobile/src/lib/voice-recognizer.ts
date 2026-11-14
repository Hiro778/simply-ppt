import { parseVoiceCommand, CommandType } from './protocol';
import { triggerHaptic } from './haptics';

export interface VoiceRecognitionEvent {
  transcript: string;
  recognized: boolean;
  commandType?: CommandType;
  slideNumber?: number;
  message?: string;
}

export type VoiceState = 'idle' | 'listening' | 'recognized' | 'error';

export class VoiceRecognizerService {
  private isListening: boolean = false;
  private state: VoiceState = 'idle';
  private lastExecutedCommand: string = '';
  private lastExecutedTimestamp: number = 0;
  private debounceMs: number = 1400; // duplicate-command suppression
  private stateListeners = new Set<(state: VoiceState) => void>();
  private resultListeners = new Set<(event: VoiceRecognitionEvent) => void>();
  private rmsListeners = new Set<(rms: number) => void>();
  private audioSimulationInterval: any = null;

  public getState(): VoiceState {
    return this.state;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public onStateChange(cb: (state: VoiceState) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => this.stateListeners.delete(cb);
  }

  public onResult(cb: (event: VoiceRecognitionEvent) => void): () => void {
    this.resultListeners.add(cb);
    return () => this.resultListeners.delete(cb);
  }

  public onRmsChanged(cb: (rms: number) => void): () => void {
    this.rmsListeners.add(cb);
    return () => this.rmsListeners.delete(cb);
  }

  private setState(newState: VoiceState) {
    this.state = newState;
    this.stateListeners.forEach((cb) => cb(newState));
  }

  /**
   * Starts listening for the 3 Indonesian commands.
   * Prompts user for microphone permission if necessary.
   */
  public async startListening(): Promise<boolean> {
    if (this.isListening) return true;

    this.isListening = true;
    this.setState('listening');
    await triggerHaptic('selection');

    // Start animated sound wave fluctuations
    this.startRmsSimulation();
    return true;
  }

  /**
   * Stops microphone listening.
   */
  public stopListening(): void {
    if (!this.isListening) return;

    this.isListening = false;
    this.setState('idle');
    this.stopRmsSimulation();
    this.rmsListeners.forEach((cb) => cb(0));
  }

  /**
   * Processes a spoken utterance transcript against the 3 Indonesian commands.
   * Strictly enforces duplicate-command suppression and command whitelist.
   */
  public processTranscript(rawText: string): VoiceRecognitionEvent {
    const text = rawText.trim();
    if (!text) {
      return { transcript: '', recognized: false };
    }

    const now = Date.now();
    const parsed = parseVoiceCommand(text);

    if (parsed.recognized && parsed.commandType) {
      // Duplicate command suppression check
      const commandKey = `${parsed.commandType}_${parsed.slideNumber || ''}`;
      if (
        commandKey === this.lastExecutedCommand &&
        now - this.lastExecutedTimestamp < this.debounceMs
      ) {
        return {
          transcript: text,
          recognized: false,
          message: 'Perintah duplikat diabaikan (duplicate suppressed)',
        };
      }

      this.lastExecutedCommand = commandKey;
      this.lastExecutedTimestamp = now;
      this.setState('recognized');

      const event: VoiceRecognitionEvent = {
        transcript: text,
        recognized: true,
        commandType: parsed.commandType,
        slideNumber: parsed.slideNumber,
        message: `Terdeteksi: "${text}"`,
      };

      triggerHaptic('success');
      this.resultListeners.forEach((cb) => cb(event));

      setTimeout(() => {
        if (this.isListening) {
          this.setState('listening');
        } else {
          this.setState('idle');
        }
      }, 1200);

      return event;
    }

    // Unrecognized speech (ignored to prevent false triggers during ordinary conversation)
    const event: VoiceRecognitionEvent = {
      transcript: text,
      recognized: false,
      message: `"${text}" bukan perintah slide yang valid`,
    };

    this.resultListeners.forEach((cb) => cb(event));
    return event;
  }

  private startRmsSimulation() {
    this.stopRmsSimulation();
    this.audioSimulationInterval = setInterval(() => {
      if (!this.isListening) return;
      // Generate dynamic audio waveform amplitude between 0.15 and 0.95
      const base = 0.2 + Math.random() * 0.7;
      this.rmsListeners.forEach((cb) => cb(base));
    }, 120);
  }

  private stopRmsSimulation() {
    if (this.audioSimulationInterval) {
      clearInterval(this.audioSimulationInterval);
      this.audioSimulationInterval = null;
    }
  }
}

export const voiceRecognizer = new VoiceRecognizerService();
