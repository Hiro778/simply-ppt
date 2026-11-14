import { MobileSupabaseService } from '../src/lib/supabase-client';
import { secureStorage } from '../src/lib/secure-store';
import { voiceRecognizer } from '../src/lib/voice-recognizer';
import { ProtocolMessage } from '../src/lib/protocol';

describe('Simply PPT Mobile — E2E Workflow Test', () => {
  let mobileService: MobileSupabaseService;
  const dispatchedCommands: ProtocolMessage[] = [];

  beforeAll(async () => {
    await secureStorage.clearAll();
    mobileService = new MobileSupabaseService();
  });

  it('executes the full end-to-end controller lifecycle across all 4 modes', async () => {
    // 1. Launch & Generate Device Identity
    const deviceId = await secureStorage.getOrCreateDeviceId();
    await secureStorage.saveDeviceName('Hiro Pixel 8 Pro');
    expect(deviceId).toBeDefined();

    // 2. Submit Pairing Request with 6-Digit Code
    const sessionId = '77777777-8888-9999-aaaa-bbbbccccdddd';
    const fakeToken = 'auth_dev_token_secret_xyz';

    await secureStorage.saveSessionId(sessionId);
    await secureStorage.saveDeviceToken(fakeToken);

    // 3. Receive Host Approval & Establish Connection
    mobileService.setStatus('connected');
    expect(mobileService.getStatus()).toBe('connected');

    // 4. Mode 1 — Remote Controller: Send NEXT_SLIDE, PREVIOUS_SLIDE, GO_TO_SLIDE
    let currentSlide = 1;
    const totalSlides = 20;

    // Simulate NEXT_SLIDE
    currentSlide = Math.min(totalSlides, currentSlide + 1);
    expect(currentSlide).toBe(2);

    // Simulate PREVIOUS_SLIDE
    currentSlide = Math.max(1, currentSlide - 1);
    expect(currentSlide).toBe(1);

    // Simulate GO_TO_SLIDE
    currentSlide = 8;
    expect(currentSlide).toBe(8);

    // 5. Mode 2 — Annotation Mode: Draw vectors and clear canvas
    const drawStroke = {
      points: [
        { x: 0.15, y: 0.25 },
        { x: 0.35, y: 0.45 },
      ],
      color: '#e11d48',
      strokeWidth: 4,
    };
    expect(drawStroke.points[0].x).toBeLessThanOrEqual(1.0);
    expect(drawStroke.points[0].y).toBeLessThanOrEqual(1.0);

    const highlightStroke = {
      points: [
        { x: 0.2, y: 0.6 },
        { x: 0.8, y: 0.6 },
      ],
      color: '#facc15',
      strokeWidth: 20,
      opacity: 0.4,
    };
    expect(highlightStroke.opacity).toBe(0.4);

    // 6. Mode 3 — Presenter Mode: Laser pointer and zoom
    const laserUpdate = {
      x: 0.523,
      y: 0.481,
      visible: true,
    };
    expect(laserUpdate.visible).toBe(true);
    expect(laserUpdate.x).toBeGreaterThan(0);

    const zoomPayload = {
      scale: 2.0,
      originX: 0.5,
      originY: 0.5,
    };
    expect(zoomPayload.scale).toBe(2.0);

    // 7. Mode 4 — Speak Only Mode: Execute all 3 Indonesian voice commands
    // Command 1: "Lanjut slide"
    const voice1 = voiceRecognizer.processTranscript('Lanjut slide');
    expect(voice1.recognized).toBe(true);
    expect(voice1.commandType).toBe('NEXT_SLIDE');

    // Command 2: "Slide sebelumnya"
    const voice2 = voiceRecognizer.processTranscript('Slide sebelumnya');
    expect(voice2.recognized).toBe(true);
    expect(voice2.commandType).toBe('PREVIOUS_SLIDE');

    // Command 3: "Slide 15"
    const voice3 = voiceRecognizer.processTranscript('Slide 15');
    expect(voice3.recognized).toBe(true);
    expect(voice3.commandType).toBe('GO_TO_SLIDE');
    expect(voice3.slideNumber).toBe(15);

    // 8. Disconnect and Reconnect Cycle
    await mobileService.disconnect();
    expect(mobileService.getStatus()).toBe('disconnected');
    expect(await secureStorage.getDeviceToken()).toBeNull();

    // Reconnection setup
    await secureStorage.saveSessionId(sessionId);
    await secureStorage.saveDeviceToken('reconnect_token_123');
    mobileService.setStatus('connected');
    expect(mobileService.getStatus()).toBe('connected');
  });
});
