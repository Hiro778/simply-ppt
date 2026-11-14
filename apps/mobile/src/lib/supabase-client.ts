import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { secureStorage } from './secure-store';
import { hashPairCode, hashRequesterSecret, generateRandomHex, generateUUID } from './crypto';
import { ProtocolMessage, CommandType, PresentationStatePayload } from './protocol';

// Default public environment credentials (overrideable via Device Settings)
const FALLBACK_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const FALLBACK_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'waiting_approval'
  | 'connected'
  | 'reconnecting'
  | 'connection_lost'
  | 'revoked';

export class MobileSupabaseService {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private currentSessionId: string | null = null;
  private currentDeviceToken: string | null = null;
  private activeStatus: ConnectionStatus = 'disconnected';
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private stateListeners = new Set<(state: PresentationStatePayload) => void>();
  private commandListeners = new Set<(msg: ProtocolMessage) => void>();
  private pollInterval: any = null;

  public async getClient(): Promise<SupabaseClient> {
    if (this.client) return this.client;
    const custom = await secureStorage.getCustomSupabaseConfig();
    const url = custom.url || FALLBACK_URL;
    const key = custom.key || FALLBACK_KEY;
    this.client = createClient(url, key, {
      auth: { persistSession: false },
      realtime: {
        params: {
          eventsPerSecond: 60,
        },
      },
    });
    return this.client;
  }

  public getStatus(): ConnectionStatus {
    return this.activeStatus;
  }

  public setStatus(newStatus: ConnectionStatus) {
    this.activeStatus = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus));
  }

  public onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.activeStatus);
    return () => this.statusListeners.delete(callback);
  }

  public onPresentationState(callback: (state: PresentationStatePayload) => void): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  public onCommand(callback: (msg: ProtocolMessage) => void): () => void {
    this.commandListeners.add(callback);
    return () => this.commandListeners.delete(callback);
  }

  /**
   * Resolves the 6-digit pair code to presentation session metadata
   */
  public async resolvePairCode(
    pairCode: string,
    deviceId: string
  ): Promise<{ success: boolean; sessionId?: string; title?: string; totalSlides?: number; error?: string }> {
    try {
      const client = await this.getClient();
      const codeHash = await hashPairCode(pairCode);

      const { data, error } = await client.rpc('rpc_resolve_pair_code', {
        p_client_identifier: deviceId,
        p_pair_code_hash: codeHash,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired pair code. Verify the 6-digit code on the desktop.',
        };
      }

      const session = data[0];
      return {
        success: true,
        sessionId: session.session_id,
        title: session.title,
        totalSlides: session.total_slides,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to Supabase' };
    }
  }

  /**
   * Submits pairing request to host presentation session
   */
  public async submitPairing(
    sessionId: string,
    deviceId: string,
    deviceName: string
  ): Promise<{ success: boolean; requestId?: string; requesterSecret?: string; error?: string }> {
    try {
      const client = await this.getClient();
      const requestId = generateUUID();
      const requesterSecret = generateRandomHex(16);
      const requesterSecretHash = await hashRequesterSecret(requesterSecret);

      const { error } = await client.rpc('rpc_submit_pairing_request', {
        p_request_id: requestId,
        p_session_id: sessionId,
        p_device_id: deviceId,
        p_device_name: deviceName,
        p_requester_secret_hash: requesterSecretHash,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await secureStorage.saveSessionId(sessionId);
      await secureStorage.saveRequestId(requestId);
      await secureStorage.saveRequesterSecret(requesterSecret);

      return {
        success: true,
        requestId,
        requesterSecret,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit pairing request' };
    }
  }

  /**
   * Polls status of pairing request until approved, rejected, or expired
   */
  public startApprovalPolling(
    requestId: string,
    requesterSecret: string,
    onApproved: (deviceToken: string) => void,
    onRejected: () => void,
    onError: (err: string) => void
  ): () => void {
    this.setStatus('waiting_approval');
    if (this.pollInterval) clearInterval(this.pollInterval);

    let attempts = 0;
    const maxAttempts = 120; // 3 minutes with 1.5s interval

    this.pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        this.stopPolling();
        this.setStatus('disconnected');
        onError('Pairing request timed out. Please try again.');
        return;
      }

      try {
        const client = await this.getClient();
        const requesterSecretHash = await hashRequesterSecret(requesterSecret);

        const { data, error } = await client.rpc('rpc_poll_pairing_status', {
          p_request_id: requestId,
          p_requester_secret_hash: requesterSecretHash,
        });

        if (error) {
          // If intermittent network, keep retrying
          return;
        }

        if (data && data.length > 0) {
          const row = data[0];
          if (row.status === 'approved' && row.device_token) {
            this.stopPolling();
            await secureStorage.saveDeviceToken(row.device_token);
            onApproved(row.device_token);
          } else if (row.status === 'rejected') {
            this.stopPolling();
            this.setStatus('disconnected');
            onRejected();
          }
        }
      } catch {
        // Network retry
      }
    }, 1500);

    return () => this.stopPolling();
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Establishes real-time bi-directional broadcast channel
   */
  public async connectRealtime(sessionId: string, deviceToken: string) {
    this.currentSessionId = sessionId;
    this.currentDeviceToken = deviceToken;
    this.setStatus('connecting');

    const client = await this.getClient();
    if (this.channel) {
      client.removeChannel(this.channel);
    }

    this.channel = client.channel(`presentation:${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on('broadcast', { event: 'command' }, (event) => {
        const msg = event.payload as ProtocolMessage;
        if (!msg) return;

        if (msg.type === 'PRESENTATION_STATE') {
          const state = msg.payload as PresentationStatePayload;
          this.stateListeners.forEach((cb) => cb(state));
        } else if (msg.type === 'DEVICE_DISCONNECTED') {
          const p = msg.payload as { deviceId?: string; reason?: string };
          // If revoked, transition to revoked status
          this.setStatus('revoked');
          secureStorage.clearSession();
        }

        this.commandListeners.forEach((cb) => cb(msg));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.setStatus('connection_lost');
        } else if (status === 'CLOSED') {
          if (this.activeStatus !== 'revoked') {
            this.setStatus('disconnected');
          }
        }
      });
  }

  /**
   * Sends a presentation command to the desktop host
   */
  public async sendCommand(type: CommandType, payload: unknown = {}): Promise<boolean> {
    if (!this.channel || !this.currentSessionId) {
      return false;
    }

    const message: ProtocolMessage = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      sessionId: this.currentSessionId,
      deviceToken: this.currentDeviceToken || undefined,
      timestamp: Date.now(),
      payload,
    };

    try {
      const res = await this.channel.send({
        type: 'broadcast',
        event: 'command',
        payload: message,
      });
      return res === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Disconnects current device session and clears local credentials
   */
  public async disconnect() {
    this.stopPolling();
    if (this.channel && this.client) {
      this.client.removeChannel(this.channel);
      this.channel = null;
    }
    await secureStorage.clearSession();
    this.setStatus('disconnected');
    this.currentSessionId = null;
    this.currentDeviceToken = null;
  }
}

export const mobileSupabase = new MobileSupabaseService();
