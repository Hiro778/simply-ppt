import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { generatePairCode, calculateExpiration, isPairCodeValid } from '../pairing/code-generator';
import { defaultPairingRateLimiter } from '../pairing/rate-limiter';
import { ProtocolMessage, PresentationStatePayload } from '../protocol/types';
import { validateProtocolMessage } from '../protocol/validator';

export interface PresentationSession {
  id: string;
  hostToken: string;
  pairCode: string;
  expiresAt: string;
  title: string;
  totalSlides: number;
  currentSlide: number;
}

export interface PairingRequest {
  id: string;
  sessionId: string;
  deviceId: string;
  deviceName: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  deviceToken?: string;
  requestedAt: string;
}

export interface PairedDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceToken: string;
  pairedAt: string;
  isActive: boolean;
}

// In-memory fallback bus for local/simulated testing when Supabase credentials are not set
class LocalSessionStore {
  public sessions = new Map<string, PresentationSession>();
  public codeToSession = new Map<string, string>();
  public requests = new Map<string, PairingRequest>();
  public pairedDevices = new Map<string, PairedDevice[]>();
  public listeners = new Map<string, Set<(msg: ProtocolMessage) => void>>();
  public requestListeners = new Map<string, Set<(req: PairingRequest) => void>>();

  public emitCommand(sessionId: string, msg: ProtocolMessage) {
    const list = this.listeners.get(sessionId);
    if (list) {
      list.forEach((cb) => cb(msg));
    }
  }

  public emitRequest(sessionId: string, req: PairingRequest) {
    const list = this.requestListeners.get(sessionId);
    if (list) {
      list.forEach((cb) => cb(req));
    }
  }
}

const localStore = new LocalSessionStore();

export class PairingService {
  /**
   * Creates a new presentation session and generates a 3-minute single-use pair code
   */
  public async createSession(title: string, totalSlides: number): Promise<PresentationSession> {
    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`;
    const hostToken = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `host_${Date.now()}`;
    const pairCode = generatePairCode();
    const expiresAt = calculateExpiration(3 * 60 * 1000).toISOString();

    const session: PresentationSession = {
      id: sessionId,
      hostToken,
      pairCode,
      expiresAt,
      title,
      totalSlides,
      currentSlide: 1,
    };

    // Store in local fallback
    localStore.sessions.set(sessionId, session);
    localStore.codeToSession.set(pairCode, sessionId);

    // If Supabase is configured, also persist to cloud
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('presentation_sessions').insert({
          id: sessionId,
          host_session_token: hostToken,
          pair_code: pairCode,
          pair_code_expires_at: expiresAt,
          title,
          total_slides: totalSlides,
          current_slide: 1,
          status: 'active',
        });
      } catch (err) {
        console.warn('Failed to persist session to Supabase, continuing in local mode:', err);
      }
    }

    return session;
  }

  /**
   * Refreshes the pair code for an existing session (3-minute extension)
   */
  public async refreshPairCode(sessionId: string): Promise<{ pairCode: string; expiresAt: string }> {
    const pairCode = generatePairCode();
    const expiresAt = calculateExpiration(3 * 60 * 1000).toISOString();

    const existing = localStore.sessions.get(sessionId);
    if (existing) {
      localStore.codeToSession.delete(existing.pairCode);
      existing.pairCode = pairCode;
      existing.expiresAt = expiresAt;
      localStore.codeToSession.set(pairCode, sessionId);
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('presentation_sessions')
          .update({
            pair_code: pairCode,
            pair_code_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      } catch (err) {
        console.warn('Failed to update pair code in Supabase:', err);
      }
    }

    return { pairCode, expiresAt };
  }

  /**
   * Submits a pairing request from a controller device using the 6-digit code
   */
  public async submitPairingRequest(
    pairCode: string,
    deviceId: string,
    deviceName: string
  ): Promise<{ success: boolean; error?: string; requestId?: string; sessionId?: string }> {
    // 1. Rate limiter check
    const rateCheck = defaultPairingRateLimiter.canAttempt(deviceId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many failed pairing attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      };
    }

    let targetSessionId = localStore.codeToSession.get(pairCode);
    let session = targetSessionId ? localStore.sessions.get(targetSessionId) : undefined;

    // Check cloud if not found in local store
    const client = getSupabaseClient();
    if (!session && client) {
      try {
        const { data, error } = await client
          .from('presentation_sessions')
          .select('*')
          .eq('pair_code', pairCode)
          .gt('pair_code_expires_at', new Date().toISOString())
          .eq('status', 'active')
          .maybeSingle();

        if (!error && data) {
          targetSessionId = data.id;
          session = {
            id: data.id,
            hostToken: data.host_session_token,
            pairCode: data.pair_code,
            expiresAt: data.pair_code_expires_at,
            title: data.title,
            totalSlides: data.total_slides,
            currentSlide: data.current_slide,
          };
          localStore.sessions.set(session.id, session);
        }
      } catch {
        // Ignored
      }
    }

    if (!session || !isPairCodeValid(session.expiresAt)) {
      defaultPairingRateLimiter.recordFailedAttempt(deviceId);
      return {
        success: false,
        error: 'Invalid or expired pair code. Please verify the 6-digit code on the desktop screen.',
      };
    }

    // Rate limiter reset on valid code
    defaultPairingRateLimiter.reset(deviceId);

    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`;
    const req: PairingRequest = {
      id: requestId,
      sessionId: session.id,
      deviceId,
      deviceName,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    localStore.requests.set(requestId, req);
    localStore.emitRequest(session.id, req);

    if (client) {
      try {
        await client.from('pairing_requests').insert({
          id: requestId,
          session_id: session.id,
          device_id: deviceId,
          device_name: deviceName,
          status: 'pending',
          requested_at: req.requestedAt,
        });
      } catch (err) {
        console.warn('Failed to insert pairing request into Supabase:', err);
      }
    }

    return {
      success: true,
      requestId,
      sessionId: session.id,
    };
  }

  /**
   * Host approves a pairing request
   */
  public async approveRequest(requestId: string): Promise<PairedDevice | null> {
    const req = localStore.requests.get(requestId);
    if (!req) return null;

    const deviceToken = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tok_${Date.now()}`;
    req.status = 'approved';
    req.deviceToken = deviceToken;

    const pairedDevice: PairedDevice = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}`,
      deviceId: req.deviceId,
      deviceName: req.deviceName,
      deviceToken,
      pairedAt: new Date().toISOString(),
      isActive: true,
    };

    const currentDevices = localStore.pairedDevices.get(req.sessionId) || [];
    currentDevices.push(pairedDevice);
    localStore.pairedDevices.set(req.sessionId, currentDevices);

    // Invalidate the pair code after single-use pairing approval
    const sess = localStore.sessions.get(req.sessionId);
    if (sess) {
      localStore.codeToSession.delete(sess.pairCode);
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('pairing_requests')
          .update({
            status: 'approved',
            device_token: deviceToken,
            responded_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        await client.from('paired_devices').insert({
          id: pairedDevice.id,
          session_id: req.sessionId,
          device_id: req.deviceId,
          device_name: req.deviceName,
          device_token: deviceToken,
          is_active: true,
        });
      } catch (err) {
        console.warn('Failed to update approval in Supabase:', err);
      }
    }

    // Broadcast DEVICE_CONNECTED notification
    this.broadcastCommand(req.sessionId, {
      id: `conn_${Date.now()}`,
      type: 'DEVICE_CONNECTED',
      sessionId: req.sessionId,
      deviceToken,
      timestamp: Date.now(),
      payload: {
        deviceId: req.deviceId,
        deviceName: req.deviceName,
        mode: 'remote',
      },
    });

    return pairedDevice;
  }

  /**
   * Host rejects a pairing request
   */
  public async rejectRequest(requestId: string): Promise<boolean> {
    const req = localStore.requests.get(requestId);
    if (!req) return false;

    req.status = 'rejected';

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('pairing_requests')
          .update({
            status: 'rejected',
            responded_at: new Date().toISOString(),
          })
          .eq('id', requestId);
      } catch (err) {
        console.warn('Failed to reject request in Supabase:', err);
      }
    }

    return true;
  }

  /**
   * Revokes or disconnects a paired device
   */
  public async revokeDevice(sessionId: string, deviceId: string): Promise<boolean> {
    const devices = localStore.pairedDevices.get(sessionId) || [];
    const target = devices.find((d) => d.deviceId === deviceId);
    if (target) {
      target.isActive = false;
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('paired_devices')
          .update({ is_active: false })
          .match({ session_id: sessionId, device_id: deviceId });
      } catch (err) {
        console.warn('Failed to update revocation in Supabase:', err);
      }
    }

    // Broadcast disconnection event
    this.broadcastCommand(sessionId, {
      id: `disc_${Date.now()}`,
      type: 'DEVICE_DISCONNECTED',
      sessionId,
      timestamp: Date.now(),
      payload: {
        deviceId,
        reason: 'Host disconnected this device.',
      },
    });

    return true;
  }

  /**
   * Listens for incoming pairing requests on the desktop host
   */
  public subscribeToPairingRequests(sessionId: string, callback: (req: PairingRequest) => void): () => void {
    let set = localStore.requestListeners.get(sessionId);
    if (!set) {
      set = new Set();
      localStore.requestListeners.set(sessionId, set);
    }
    set.add(callback);

    const client = getSupabaseClient();
    let channel: RealtimeChannel | null = null;

    if (client) {
      channel = client
        .channel(`requests:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pairing_requests',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              session_id: string;
              device_id: string;
              device_name: string;
              status: 'pending' | 'approved' | 'rejected' | 'expired';
              requested_at: string;
            };
            callback({
              id: row.id,
              sessionId: row.session_id,
              deviceId: row.device_id,
              deviceName: row.device_name,
              status: row.status,
              requestedAt: row.requested_at,
            });
          }
        )
        .subscribe();
    }

    return () => {
      set?.delete(callback);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }

  /**
   * Subscribes to remote control commands for this session
   */
  public subscribeToCommands(sessionId: string, onCommand: (msg: ProtocolMessage) => void): () => void {
    let set = localStore.listeners.get(sessionId);
    if (!set) {
      set = new Set();
      localStore.listeners.set(sessionId, set);
    }
    set.add(onCommand);

    const client = getSupabaseClient();
    let channel: RealtimeChannel | null = null;

    if (client) {
      channel = client
        .channel(`presentation:${sessionId}`)
        .on('broadcast', { event: 'command' }, (event) => {
          const raw = event.payload;
          const validation = validateProtocolMessage(raw);
          if (validation.success && validation.data) {
            onCommand(validation.data);
          }
        })
        .subscribe();
    }

    return () => {
      set?.delete(onCommand);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }

  /**
   * Dispatches a command message (from desktop or controller)
   */
  public broadcastCommand(sessionId: string, message: ProtocolMessage): void {
    localStore.emitCommand(sessionId, message);

    const client = getSupabaseClient();
    if (client) {
      client
        .channel(`presentation:${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'command',
          payload: message,
        })
        .catch((err) => {
          console.warn('Failed to broadcast realtime message:', err);
        });
    }
  }

  /**
   * Broadcasts desktop presentation state back to paired controllers
   */
  public broadcastPresentationState(sessionId: string, state: PresentationStatePayload): void {
    const msg: ProtocolMessage = {
      id: `state_${Date.now()}`,
      type: 'PRESENTATION_STATE',
      sessionId,
      timestamp: Date.now(),
      payload: state,
    };
    this.broadcastCommand(sessionId, msg);
  }

  /**
   * Test connection to Supabase and measure round-trip latency
   */
  public async testConnection(): Promise<{ connected: boolean; latencyMs?: number; mode: 'supabase' | 'local' }> {
    if (!isSupabaseConfigured()) {
      return { connected: true, mode: 'local' };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { connected: true, mode: 'local' };
    }

    const start = performance.now();
    try {
      const { error } = await client.from('presentation_sessions').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      if (error && error.code !== 'PGRST116') {
        return { connected: false, mode: 'supabase' };
      }
      return { connected: true, latencyMs: latency, mode: 'supabase' };
    } catch {
      return { connected: false, mode: 'supabase' };
    }
  }
}

export const pairingService = new PairingService();
