# SIMPLY PPT — PHASE 2: ANDROID APK DEVELOPMENT

PROJECT: Simply PPT  
REPOSITORY: https://github.com/Hiro778/simply-ppt  
BRANCH: main  
OWNER: Hiro778  
PHASE: 2 — Android Controller  
EXECUTION: FULL AUTONOMOUS E2E DEVELOPMENT

## 1. MISSION

You are continuing an existing software project.

Your mission is to develop the official Simply PPT Android Controller application as a fully functional Android APK.

This is a continuation of Phase 1, not a new project.

The existing desktop application is already implemented and published.

You MUST inspect the current repository before writing code.

Read these files first:

- README.md
- docs/MOBILE_CONTRACT.md
- SECURITY.md
- supabase/schema.sql
- src/lib/supabase/service.ts
- Shared protocol types and Zod schemas.
- Existing pairing implementation.
- Existing mobile simulator.

Do not duplicate or replace existing functionality unnecessarily.

## 2. DEVELOPMENT SCOPE

Build Android APK only.

Preferred stack:

- React Native
- Expo
- TypeScript
- Expo Router
- Supabase JavaScript client
- Supabase Realtime
- Zod
- Expo SecureStore
- Native Android speech recognition integration.

Use compatible, maintained dependencies.

Do not create an iOS application in this phase.

Do not redesign or rewrite the desktop application.

Only modify desktop or shared code if necessary for genuine protocol compatibility or security fixes.

## 3. APPLICATION IDENTITY

Product: Simply PPT

Tagline: A smarter way to present.

Design direction:

- Premium dark glassmorphism.
- Midnight navy background.
- Purple and violet accents.
- Soft glowing gradients.
- Rounded interactive controls.
- Modern typography.
- Lucide icons.
- Smooth micro-interactions.
- Haptic feedback.
- Consistent visual identity with desktop.

Avoid generic template-like interfaces.

The application must feel like a finished commercial Android product.

## 4. REQUIRED SCREENS

Implement the following screens:

1. Splash Screen
2. Welcome Screen
3. Pair Device
4. Connection Approval Status
5. Connected Screen
6. Mode Selection
7. Remote Mode
8. Annotation Mode
9. Presenter Mode
10. Speak Only Mode
11. Device Settings
12. Connection Error / Reconnection Screen

After successful pairing, users MUST select their desired operating mode.

Do not automatically open Remote Mode.

Users must be able to switch modes without pairing again.

## 5. PAIRING SYSTEM

Follow the existing desktop communication contract.

The desktop generates a six-digit pairing code with a three-minute expiration.

The Android application must:

1. Allow entry of six numeric digits.
2. Validate input.
3. Submit the pairing request through the existing secure Supabase flow.
4. Send device metadata.
5. Wait for host approval.
6. Handle approval and rejection.
7. Receive an authorized device session.
8. Establish the correct session-scoped Realtime channel.
9. Store sensitive credentials securely.
10. Display successful connection status.

Use Expo SecureStore or an equivalent secure native credential store.

Do not store device tokens in AsyncStorage, plaintext files, console logs, or ordinary application state persistence.

Never expose service-role credentials.

Never bypass desktop host approval.

Never create an alternative insecure pairing mechanism.

Support:

- Connection timeout.
- Invalid code.
- Expired code.
- Rejected request.
- Lost connection.
- Reconnection.
- Device revocation.
- Session expiration.

The phone and laptop MUST NOT require the same Wi-Fi network.

The connection must work over mobile data and Wi-Fi through Supabase.

## 6. MODE 1 — REMOTE

Build a touch-friendly remote controller.

Features:

- Large Next Slide button.
- Large Previous Slide button.
- Current slide number.
- Total slide count.
- Slide navigation drawer.
- Direct slide selection.
- First slide.
- Last slide.
- Presentation timer.
- Elapsed presentation time.
- Live connection indicator.

The interface must be usable with one hand.

Buttons must provide immediate visual and haptic feedback.

Commands:

NEXT_SLIDE
PREVIOUS_SLIDE
GO_TO_SLIDE

## 7. MODE 2 — ANNOTATION

Build a complete drawing interface.

Features:

- Freehand drawing.
- Color selection.
- Adjustable stroke width.
- Text highlighter.
- Adjustable highlight opacity.
- Undo.
- Clear annotation.
- Touch gestures.
- Canvas coordinate normalization.

Send drawing data through the existing protocol.

Coordinate values must remain between 0.0 and 1.0.

Implement event batching or throttling to prevent excessive network traffic.

Ensure annotations appear correctly on the laptop presentation canvas.

Annotations must not modify the original PDF.

## 8. MODE 3 — PRESENTER

Build a presenter-focused controller.

Features:

- Current slide preview.
- Next slide preview.
- Slide thumbnails.
- Direct slide navigation.
- Current slide number.
- Total slide count.
- Virtual laser pointer.
- Zoom controls.
- Slide notes display only when notes are available.

Laser pointer coordinates must be normalized.

Implement approximately 60 Hz maximum pointer event updates, with appropriate throttling.

Zoom must follow the existing protocol.

The laptop remains the source of truth for the presentation state.

## 9. MODE 4 — SPEAK ONLY

This mode MUST recognize exactly THREE Indonesian voice commands.

COMMAND 1:
"Lanjut slide"

Action:
NEXT_SLIDE

COMMAND 2:
"Slide sebelumnya"

Action:
PREVIOUS_SLIDE

COMMAND 3:
"Slide [number]"

Example:
"Slide 5"

Action:
GO_TO_SLIDE with slideNumber = 5.

STRICT RULES:

- No zoom voice command.
- No drawing voice command.
- No pause voice command.
- No other voice commands.
- Do not use a general AI conversational assistant.
- Do not send ordinary speech to a cloud AI service.
- Only recognized commands may generate presentation actions.

Implement:

- Android microphone permission.
- Native speech recognition.
- Indonesian language recognition where supported.
- Listening indicator.
- Voice waveform animation.
- Recognition feedback.
- Command confirmation.
- Error handling.
- Start/stop listening controls.
- Duplicate-command suppression.

Prevent accidental commands during ordinary conversation as much as reasonably possible.

The UI must clearly show when listening is active.

Document Android background microphone restrictions. Do not falsely claim unlimited continuous background listening.

## 10. REALTIME COMMUNICATION

Reuse the existing Simply PPT protocol.

Required events include:

- NEXT_SLIDE
- PREVIOUS_SLIDE
- GO_TO_SLIDE
- DRAW
- HIGHLIGHT
- CLEAR_ANNOTATION
- LASER_POINTER
- ZOOM
- PRESENTATION_STATE
- DEVICE_CONNECTED
- DEVICE_DISCONNECTED

Requirements:

- Correct session ID.
- Authorized device token.
- Zod runtime validation.
- Timestamp validation.
- Duplicate event protection.
- Connection status monitoring.
- Reconnection handling.
- Session isolation.
- Revocation handling.

Never trust client-side state as proof of authorization.

Follow the existing security model and investigate any mismatch between the desktop implementation and MOBILE_CONTRACT.md.

Do not silently bypass security checks to make the connection work.

## 11. CONNECTION EXPERIENCE

Implement clear connection states:

- Disconnected.
- Connecting.
- Waiting for host approval.
- Connected.
- Reconnecting.
- Connection lost.
- Session revoked.

The application should recover gracefully when internet connectivity returns.

If the connection drops, show an obvious visual warning.

Do not falsely indicate that a command was executed if the desktop has not confirmed it.

## 12. PERFORMANCE AND RELIABILITY

Optimize for ordinary Android devices.

Requirements:

- Low memory consumption.
- Smooth animations.
- Efficient Realtime subscriptions.
- Proper cleanup of listeners.
- Avoid unnecessary rerenders.
- Proper handling of application background/foreground transitions.
- Avoid duplicate subscriptions.
- Prevent stale commands after reconnection.
- Support portrait orientation.

## 13. TESTING

Create comprehensive automated tests.

Unit tests:

- Pair code validation.
- Voice command parser.
- Protocol validation.
- Navigation logic.
- Session state.
- Device authorization.
- Annotation coordinate normalization.

Integration tests:

- Pairing lifecycle.
- Host approval.
- Supabase Realtime connection.
- Device token handling.
- Session revocation.
- Reconnection.
- All four controller modes.

E2E tests:

- Launch application.
- Enter pairing code.
- Receive approval.
- Select Remote.
- Send next slide.
- Send previous slide.
- Switch to Annotation.
- Draw and clear.
- Switch to Presenter.
- Navigate thumbnails.
- Switch to Speak Only.
- Execute all three voice commands.
- Disconnect and reconnect.

Use mock services for tests that do not require real credentials.

Do not present mock tests as proof of real cross-network functionality.

## 14. REAL DEVICE VERIFICATION

When a physical Android device and Supabase credentials are available, test:

- Real APK installation.
- Pairing with desktop.
- Mobile data to laptop Wi-Fi.
- Different networks.
- Host approval.
- Actual slide navigation.
- Actual annotation rendering.
- Laser pointer.
- Zoom.
- Indonesian voice recognition.
- Device revocation.
- Network interruption and recovery.

Document any tests that cannot be performed.

## 15. APK BUILD

Deliver an installable Android APK.

Requirements:

- Production/preview build profile.
- Proper application ID.
- Application name: Simply PPT.
- App icon.
- Splash screen.
- Version number.
- Android permissions.
- Secure environment configuration.

Build a real APK, not just an Expo development client.

Preferred deliverable:

artifacts/simply-ppt-android.apk

If EAS Build requires authentication, inspect available local Android build options.

Do not claim an APK was produced unless the file exists and installation has been verified.

## 16. GITHUB AND AUTOMATION

Continue using the existing repository:

https://github.com/Hiro778/simply-ppt.git

Create the mobile application in an appropriate monorepo structure.

Suggested structure:

apps/
  desktop/
  mobile/

packages/
  shared-types/
  protocol/
  validators/

Preserve existing desktop source.

Update:

- README.md
- docs/MOBILE_CONTRACT.md if necessary
- SECURITY.md
- .env.example
- Mobile setup documentation.

Add GitHub Actions for appropriate mobile validation:

- TypeScript.
- Lint.
- Unit tests.
- Android build verification where supported.

Do not commit secrets, signing credentials, or private environment files.

Commit and push verified changes to main.

Never force-push.

## 17. FINAL REPORT

Provide:

1. Mobile application architecture.
2. Screens implemented.
3. Four mode implementation status.
4. Pairing integration status.
5. Supabase integration verification.
6. Security review.
7. Test results.
8. Physical device testing results.
9. APK file location and size.
10. APK installation instructions.
11. GitHub commit hash.
12. Remaining limitations.

Distinguish actual testing from simulation.

## 18. COMPLETION CRITERIA

Phase 2 is complete only when:

- Android application builds.
- APK exists.
- APK installs.
- Pairing flow works.
- Four modes work.
- Three voice commands work.
- Desktop receives real commands.
- Security checks pass.
- Documentation is updated.
- Changes are pushed to GitHub.

If physical device or credentials are unavailable, explicitly report the incomplete verification instead of claiming full completion.

Do not stop at a UI prototype.

Build a functional product.

FINAL OBJECTIVE:

Deliver Simply PPT Android Controller as a real, installable, secure Android APK that works with the existing Simply PPT desktop application.
