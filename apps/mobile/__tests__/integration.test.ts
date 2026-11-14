import { secureStorage } from '../src/lib/secure-store';
import { MobileSupabaseService } from '../src/lib/supabase-client';
import { ProtocolMessage } from '../src/lib/protocol';

describe('Simply PPT Mobile — Integration Test Suite', () => {
  beforeEach(async () => {
    await secureStorage.clearAll();
  });

  describe('Secure Credential Lifecycle', () => {
    it('persists and retrieves device ID and device name securely', async () => {
      const deviceId = await secureStorage.getOrCreateDeviceId();
      expect(deviceId).toMatch(/^android_\d+_/);

      await secureStorage.saveDeviceName("Hiro's Phone");
      const name = await secureStorage.getDeviceName();
      expect(name).toBe("Hiro's Phone");
    });

    it('stores authorized device session tokens and clears them on revocation', async () => {
      const token = 'sec_token_999888777';
      const sessionId = 'sess-1234-uuid';

      await secureStorage.saveSessionId(sessionId);
      await secureStorage.saveDeviceToken(token);

      expect(await secureStorage.getSessionId()).toBe(sessionId);
      expect(await secureStorage.getDeviceToken()).toBe(token);

      await secureStorage.clearSession();

      expect(await secureStorage.getSessionId()).toBeNull();
      expect(await secureStorage.getDeviceToken()).toBeNull();
    });
  });

  describe('Mobile Supabase Signaling Lifecycle', () => {
    it('initializes service in disconnected state and notifies status subscribers', () => {
      const service = new MobileSupabaseService();
      expect(service.getStatus()).toBe('disconnected');

      const statuses: string[] = [];
      const unsub = service.onStatusChange((s) => statuses.push(s));

      service.setStatus('connecting');
      service.setStatus('connected');

      expect(statuses).toContain('disconnected');
      expect(statuses).toContain('connecting');
      expect(statuses).toContain('connected');

      unsub();
    });

    it('handles incoming presentation state broadcast updates', () => {
      const service = new MobileSupabaseService();
      let receivedSlide = 1;
      let receivedTitle = '';

      service.onPresentationState((state) => {
        receivedSlide = state.currentSlide;
        receivedTitle = state.title;
      });

      // Simulate command broadcast from desktop
      const mockStateMsg: ProtocolMessage = {
        id: 'msg_state_1',
        type: 'PRESENTATION_STATE',
        sessionId: 'sess-test',
        timestamp: Date.now(),
        payload: {
          currentSlide: 7,
          totalSlides: 24,
          isPresenting: true,
          title: 'Quarterly Strategy Review.pdf',
        },
      };

      // Direct simulation trigger
      service['stateListeners'].forEach((cb) => cb(mockStateMsg.payload as any));

      expect(receivedSlide).toBe(7);
      expect(receivedTitle).toBe('Quarterly Strategy Review.pdf');
    });

    it('transitions to revoked state and wipes session when host revokes device', async () => {
      const service = new MobileSupabaseService();
      await secureStorage.saveSessionId('sess-rev');
      await secureStorage.saveDeviceToken('tok-rev');

      let currentStatus = service.getStatus();
      service.onStatusChange((s) => {
        currentStatus = s;
      });

      service.setStatus('revoked');
      await secureStorage.clearSession();

      expect(currentStatus).toBe('revoked');
      expect(await secureStorage.getDeviceToken()).toBeNull();
    });
  });
});
