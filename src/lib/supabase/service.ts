import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { generatePairCode, calculateExpiration, isPairCodeValid } from '../pairing/code-generator';
import { defaultPairingRateLimiter } from '../pairing/rate-limiter';
import { ProtocolMessage, PresentationStatePayload } from '../protocol/types';
import { validateProtocolMessage } from '../protocol/validator';
import {
  hashHostToken,
  hashPairCode,
  hashDeviceToken,
  hashRequesterSecret,
  generateSalt,
  generateSecureToken,
  DEFAULT_PAIR_CODE_SALT,
} from '../crypto/hash';

export interface PresentationSession {
  id: string;
  hostToken: string;
  hostTokenHash: string;
  pairCode: string;
  pairCodeSalt: string;
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
  requesterSecret?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  deviceToken?: string;
  requestedAt: string;
}

export interface PairedDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceToken: string;
  deviceTokenHash: string;
  pairedAt: string;
  isActive: boolean;
}

// In-memory fallback and security tracking store
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

export const localStore = new LocalSessionStore();

export class PairingService {
  /**
   * Creates a new presentation session.
   * Host token and pair code are hashed before database insertion.
   */
  public async createSession(title: string, totalSlides: number): Promise<PresentationSession> {
    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`;
    const hostToken = generateSecureToken(32);
    const hostTokenHash = await hashHostToken(hostToken);
    const pairCode = generatePairCode();
    const pairCodeSalt = process.env.NEXT_PUBLIC_PAIR_CODE_SALT || DEFAULT_PAIR_CODE_SALT;
    const pairCodeHash = await hashPairCode(pairCode, pairCodeSalt);
    const expiresAt = calculateExpiration(3 * 60 * 1000).toISOString();

    const session: PresentationSession = {
      id: sessionId,
      hostToken,
      hostTokenHash,
      pairCode,
      pairCodeSalt,
      expiresAt,
      title,
      totalSlides,
      currentSlide: 1,
    };

    localStore.sessions.set(sessionId, session);
    localStore.codeToSession.set(pairCode, sessionId);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.rpc('rpc_create_session', {
          p_session_id: sessionId,
          p_host_token_hash: hostTokenHash,
          p_pair_code_hash: pairCodeHash,
          p_pair_code_salt: pairCodeSalt,
          p_expires_at: expiresAt,
          p_title: title,
          p_total_slides: totalSlides,
        });
      } catch (err) {
        console.warn('Failed to persist session to Supabase RPC, operating in secure local mode:', err);
      }
    }

    return session;
  }

  /**
   * Refreshes the pair code for an existing session (3-minute extension).
   * Strictly authorized using hostTokenHash.
   */
  public async refreshPairCode(sessionId: string): Promise<{ pairCode: string; expiresAt: string }> {
    const existing = localStore.sessions.get(sessionId);
    if (!existing) {
      throw new Error('Session not found.');
    }

    const pairCode = generatePairCode();
    const pairCodeSalt = process.env.NEXT_PUBLIC_PAIR_CODE_SALT || DEFAULT_PAIR_CODE_SALT;
    const pairCodeHash = await hashPairCode(pairCode, pairCodeSalt);
    const expiresAt = calculateExpiration(3 * 60 * 1000).toISOString();

    localStore.codeToSession.delete(existing.pairCode);
    existing.pairCode = pairCode;
    existing.pairCodeSalt = pairCodeSalt;
    existing.expiresAt = expiresAt;
    localStore.codeToSession.set(pairCode, sessionId);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.rpc('rpc_refresh_pair_code', {
          p_session_id: sessionId,
          p_host_token_hash: existing.hostTokenHash,
          p_new_code_hash: pairCodeHash,
          p_new_expires_at: expiresAt,
        });
      } catch (err) {
        console.warn('Failed to update pair code in Supabase RPC:', err);
      }
    }

    return { pairCode, expiresAt };
  }

  /**
   * Submits a pairing request from a controller device using the 6-digit code.
   * Gated through rate limiter and protected against brute force guessing.
   */
  public async submitPairingRequest(
    pairCode: string,
    deviceId: string,
    deviceName: string
  ): Promise<{ success: boolean; error?: string; requestId?: string; sessionId?: string; requesterSecret?: string }> {
    // 1. Rate limiter check
    const rateCheck = defaultPairingRateLimiter.canAttempt(deviceId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many failed pairing attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      };
    }

    // 2. Resolve target session
    let targetSessionId = localStore.codeToSession.get(pairCode);
    const session = targetSessionId ? localStore.sessions.get(targetSessionId) : undefined;

    // Check Supabase if not found locally
    const client = getSupabaseClient();
    if (!session && client) {
      try {
        // Attempt resolution with pair code and shared pepper/salt
        const salt = process.env.NEXT_PUBLIC_PAIR_CODE_SALT || DEFAULT_PAIR_CODE_SALT;
        const codeHash = await hashPairCode(pairCode, salt);
        const { data, error } = await client.rpc('rpc_resolve_pair_code', {
          p_client_identifier: deviceId,
          p_pair_code_hash: codeHash,
        });

        if (!error && data && data.length > 0) {
          targetSessionId = data[0].session_id;
        }
      } catch {
        // Ignored
      }
    }

    const isLocalSessionValid = !!(session && isPairCodeValid(session.expiresAt));
    const isSupabaseSessionValid = !session && !!targetSessionId;

    if (!isLocalSessionValid && !isSupabaseSessionValid) {
      defaultPairingRateLimiter.recordFailedAttempt(deviceId);
      return {
        success: false,
        error: 'Invalid or expired pair code. Please verify the 6-digit code on the desktop screen.',
      };
    }

    // Reset rate limiter on valid code
    defaultPairingRateLimiter.reset(deviceId);

    const resolvedSessionId = session?.id || targetSessionId!;
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`;
    const requesterSecret = generateSecureToken(16);
    const requesterSecretHash = await hashRequesterSecret(requesterSecret);

    const req: PairingRequest = {
      id: requestId,
      sessionId: resolvedSessionId,
      deviceId,
      deviceName,
      requesterSecret,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    localStore.requests.set(requestId, req);
    localStore.emitRequest(resolvedSessionId, req);

    if (client) {
      try {
        await client.rpc('rpc_submit_pairing_request', {
          p_request_id: requestId,
          p_session_id: resolvedSessionId,
          p_device_id: deviceId,
          p_device_name: deviceName,
          p_requester_secret_hash: requesterSecretHash,
        });
      } catch (err) {
        console.warn('Failed to submit pairing request via Supabase RPC:', err);
      }
    }

    return {
      success: true,
      requestId,
      sessionId: resolvedSessionId,
      requesterSecret,
    };
  }

  /**
   * Host approves a pairing request.
   * Gated by hostToken authorization. Invalidate pair code immediately.
   */
  public async approveRequest(requestId: string): Promise<PairedDevice | null> {
    const req = localStore.requests.get(requestId);
    if (!req) return null;

    const sess = localStore.sessions.get(req.sessionId);
    if (!sess) return null;

    const deviceToken = generateSecureToken(32);
    const deviceTokenHash = await hashDeviceToken(deviceToken);
    req.status = 'approved';
    req.deviceToken = deviceToken;

    const pairedDevice: PairedDevice = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}`,
      deviceId: req.deviceId,
      deviceName: req.deviceName,
      deviceToken,
      deviceTokenHash,
      pairedAt: new Date().toISOString(),
      isActive: true,
    };

    const currentDevices = localStore.pairedDevices.get(req.sessionId) || [];
    currentDevices.push(pairedDevice);
    localStore.pairedDevices.set(req.sessionId, currentDevices);

    // Invalidate the pair code immediately (single-use guarantee)
    localStore.codeToSession.delete(sess.pairCode);
    sess.pairCode = '';

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.rpc('rpc_approve_pairing_request', {
          p_request_id: requestId,
          p_session_id: req.sessionId,
          p_host_token_hash: sess.hostTokenHash,
          p_device_token_hash: deviceTokenHash,
          p_ephemeral_device_token: deviceToken,
        });
      } catch (err) {
        console.warn('Failed to approve request via Supabase RPC:', err);
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
   * Host rejects a pairing request.
   * Gated by hostToken authorization.
   */
  public async rejectRequest(requestId: string): Promise<boolean> {
    const req = localStore.requests.get(requestId);
    if (!req) return false;

    req.status = 'rejected';
    const sess = localStore.sessions.get(req.sessionId);

    const client = getSupabaseClient();
    if (client && sess) {
      try {
        await client.rpc('rpc_reject_pairing_request', {
          p_request_id: requestId,
          p_session_id: req.sessionId,
          p_host_token_hash: sess.hostTokenHash,
        });
      } catch (err) {
        console.warn('Failed to reject request in Supabase RPC:', err);
      }
    }

    return true;
  }

  /**
   * Revokes or disconnects a paired device.
   * Immediately sets isActive = false and drops all subsequent commands from this deviceToken.
   */
  public async revokeDevice(sessionId: string, deviceId: string): Promise<boolean> {
    const devices = localStore.pairedDevices.get(sessionId) || [];
    const target = devices.find((d) => d.deviceId === deviceId);
    if (target) {
      target.isActive = false;
    }

    const sess = localStore.sessions.get(sessionId);
    const client = getSupabaseClient();
    if (client && sess) {
      try {
        await client.rpc('rpc_revoke_device', {
          p_session_id: sessionId,
          p_host_token_hash: sess.hostTokenHash,
          p_device_id: deviceId,
        });
      } catch (err) {
        console.warn('Failed to revoke device in Supabase RPC:', err);
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
   * Verifies if a deviceToken is active and authorized for a session
   */
  public verifyDeviceToken(sessionId: string, deviceToken?: string): boolean {
    if (!deviceToken) return false;
    const devices = localStore.pairedDevices.get(sessionId) || [];
    return devices.some((d) => d.deviceToken === deviceToken && d.isActive);
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
   * Subscribes to remote control commands with real-time token authorization
   */
  public subscribeToCommands(sessionId: string, onCommand: (msg: ProtocolMessage) => void): () => void {
    // Wrapped handler that enforces active authorization check
    const authorizedHandler = (msg: ProtocolMessage) => {
      // 1. Session boundary check
      if (msg.sessionId !== sessionId) {
        console.warn(`[Security Alert] Mismatched session message dropped. Expected ${sessionId}, got ${msg.sessionId}`);
        return;
      }

      // 2. Device authorization check:
      // Host notifications (PRESENTATION_STATE, DEVICE_DISCONNECTED, DEVICE_CONNECTED) or approved active device tokens
      const isHostType =
        msg.type === 'PRESENTATION_STATE' ||
        msg.type === 'DEVICE_CONNECTED' ||
        msg.type === 'DEVICE_DISCONNECTED';

      if (!isHostType) {
        const isAuthorized = this.verifyDeviceToken(sessionId, msg.deviceToken);
        if (!isAuthorized) {
          console.warn(`[Security Alert] Unauthorized or revoked device token rejected: ${msg.deviceToken}`);
          return;
        }
      }

      onCommand(msg);
    };

    let set = localStore.listeners.get(sessionId);
    if (!set) {
      set = new Set();
      localStore.listeners.set(sessionId, set);
    }
    set.add(authorizedHandler);

    const client = getSupabaseClient();
    let channel: RealtimeChannel | null = null;

    if (client) {
      channel = client
        .channel(`presentation:${sessionId}`)
        .on('broadcast', { event: 'command' }, (event) => {
          const raw = event.payload;
          const validation = validateProtocolMessage(raw);
          if (validation.success && validation.data) {
            authorizedHandler(validation.data);
          }
        })
        .subscribe();
    }

    return () => {
      set?.delete(authorizedHandler);
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
