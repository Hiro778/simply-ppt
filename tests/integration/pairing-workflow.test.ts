import { describe, it, expect } from 'vitest';
import { pairingService } from '@/lib/supabase/service';
import { ProtocolMessage } from '@/lib/protocol/types';

describe('Pairing & Remote Control Workflow (Integration)', () => {
  it('executes the full end-to-end pairing, approval, command, and revocation lifecycle', async () => {
    // 1. Host creates a presentation session
    const session = await pairingService.createSession('Keynote Presentation.pdf', 20);
    expect(session.id).toBeDefined();
    expect(session.pairCode).toMatch(/^\d{6}$/);
    expect(session.totalSlides).toBe(20);

    // 2. Set up host listener for incoming pairing requests
    let capturedRequest: any = null;
    const unsubRequests = pairingService.subscribeToPairingRequests(session.id, (req) => {
      capturedRequest = req;
    });

    // 3. Mobile controller submits pairing request with 6-digit code
    const mobileDeviceId = 'phone-pixel8-999';
    const mobileDeviceName = 'Hiro’s Pixel 8';

    const reqResult = await pairingService.submitPairingRequest(
      session.pairCode,
      mobileDeviceId,
      mobileDeviceName
    );

    expect(reqResult.success).toBe(true);
    expect(reqResult.requestId).toBeDefined();
    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest.deviceName).toBe(mobileDeviceName);
    expect(capturedRequest.deviceId).toBe(mobileDeviceId);

    // 4. Host approves the device request
    const approvedDevice = await pairingService.approveRequest(reqResult.requestId!);
    expect(approvedDevice).not.toBeNull();
    expect(approvedDevice?.deviceToken).toBeDefined();
    expect(approvedDevice?.isActive).toBe(true);

    // 5. Establish bi-directional command channel
    const receivedCommands: ProtocolMessage[] = [];
    const unsubCommands = pairingService.subscribeToCommands(session.id, (msg) => {
      receivedCommands.push(msg);
    });

    // 6. Mobile sends NEXT_SLIDE
    pairingService.broadcastCommand(session.id, {
      id: 'cmd-next',
      type: 'NEXT_SLIDE',
      sessionId: session.id,
      deviceToken: approvedDevice?.deviceToken,
      timestamp: Date.now(),
      payload: {},
    });

    expect(receivedCommands.length).toBe(1);
    expect(receivedCommands[0].type).toBe('NEXT_SLIDE');

    // 7. Mobile sends GO_TO_SLIDE
    pairingService.broadcastCommand(session.id, {
      id: 'cmd-goto',
      type: 'GO_TO_SLIDE',
      sessionId: session.id,
      deviceToken: approvedDevice?.deviceToken,
      timestamp: Date.now(),
      payload: { slideNumber: 8 },
    });

    expect(receivedCommands.length).toBe(2);
    expect(receivedCommands[1].type).toBe('GO_TO_SLIDE');
    expect((receivedCommands[1].payload as any).slideNumber).toBe(8);

    // 8. Mobile sends LASER_POINTER coordinates
    pairingService.broadcastCommand(session.id, {
      id: 'cmd-laser',
      type: 'LASER_POINTER',
      sessionId: session.id,
      deviceToken: approvedDevice?.deviceToken,
      timestamp: Date.now(),
      payload: { x: 0.55, y: 0.42, visible: true },
    });

    expect(receivedCommands.length).toBe(3);
    expect(receivedCommands[2].type).toBe('LASER_POINTER');
    expect((receivedCommands[2].payload as any).visible).toBe(true);

    // 9. Host broadcasts presentation state back to mobile
    pairingService.broadcastPresentationState(session.id, {
      currentSlide: 8,
      totalSlides: 20,
      isPresenting: true,
      title: 'Keynote Presentation.pdf',
    });

    expect(receivedCommands.length).toBe(4);
    expect(receivedCommands[3].type).toBe('PRESENTATION_STATE');

    // 10. Host revokes device session
    await pairingService.revokeDevice(session.id, mobileDeviceId);
    expect(receivedCommands.length).toBe(5);
    expect(receivedCommands[4].type).toBe('DEVICE_DISCONNECTED');
    expect((receivedCommands[4].payload as any).deviceId).toBe(mobileDeviceId);

    // Cleanup
    unsubRequests();
    unsubCommands();
  });

  it('rejects pairing attempts with invalid pair code', async () => {
    const res = await pairingService.submitPairingRequest('000000', 'hacker-dev', 'Untrusted Device');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid or expired pair code');
  });

  it('allows host to refresh code and extends expiration', async () => {
    const session = await pairingService.createSession('Slides.pdf', 10);
    const oldCode = session.pairCode;

    const refreshed = await pairingService.refreshPairCode(session.id);
    expect(refreshed.pairCode).toMatch(/^\d{6}$/);
    expect(refreshed.expiresAt).toBeDefined();

    // Verify old code is no longer valid
    const oldAttempt = await pairingService.submitPairingRequest(oldCode, 'dev-old', 'Old Attempt');
    expect(oldAttempt.success).toBe(false);

    // Verify new code works
    const newAttempt = await pairingService.submitPairingRequest(refreshed.pairCode, 'dev-new', 'New Attempt');
    expect(newAttempt.success).toBe(true);
  });
});
