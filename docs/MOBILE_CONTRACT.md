# Mobile Communication Contract — Simply PPT (Phase 2 Integration)

This document specifies the communication contract between the **Simply PPT Desktop Application** and the **Future Simply PPT Android Mobile Application (Phase 2)** via Supabase.

---

## 1. Overview & Transport Architecture

- **Transport:** Supabase Realtime Broadcast & Database Webhooks.
- **Privacy Guarantee:** Presentation PDF files **never** leave the desktop host. Only low-bandwidth control signals, coordinates, and presentation state flow between devices.
- **Network Agnostic:** Works over cellular (4G/5G) or Wi-Fi without requiring both devices to share the same local network.
- **Fail-safe:** If Supabase disconnects, desktop presentations continue working offline uninterrupted.

---

## 2. Pairing Lifecycle

```
[Mobile Controller]                    [Supabase]                   [Desktop Host]
         |                                  |                              |
         |                                  | <--- Generates 6-digit Code  |
         |                                  |      (3 min countdown)       |
         | --- Submits Code & DeviceID ---> |                              |
         |                                  | --- Dispatches Request ----> |
         |                                  |                              | [Host Modal]
         |                                  |                              | User clicks:
         |                                  |                              | "Approve" / "Deny"
         |                                  | <--- Host Approves Device -- |
         | <--- Returns Session Token ----- |                              |
         |                                  |                              |
         | ======== Realtime Broadcast Channel Established =============== |
```

1. **Host Generation:** Desktop requests or generates a 6-digit cryptographically random numeric code.
2. **Expiration:** Active code expires after exactly **180 seconds (3 minutes)**.
3. **Device Request:** Mobile app enters code + device metadata (`deviceId`, `deviceName`).
4. **Desktop Host Approval:** Desktop prompts host user with an approval modal.
5. **Session Handshake:** Desktop assigns a secure session token to the approved device.
6. **Command Channel:** Direct bi-directional messaging on channel `simply_ppt_session_{sessionId}`.

---

## 3. Supported Mobile Modes

The future Phase 2 Android Application provides 4 operating modes:

1. **Remote Mode:**
   - Big touch-friendly Next & Previous slide buttons.
   - Slide selector & jump drawer.
   - Presentation timer & elapsed time display.
2. **Annotation Mode:**
   - Freehand Pen / Drawing (`DRAW` command).
   - Text Highlighter (`HIGHLIGHT` command).
   - Clear All Annotations (`CLEAR_ANNOTATION` command).
3. **Presenter Mode:**
   - Real-time virtual Laser Pointer (`LASER_POINTER` command via touch pad or gyro).
   - Zoom into specific regions (`ZOOM` command).
   - Slide notes view (if provided).
4. **Speak Only Mode:**
   - Hands-free voice recognition.
   - **Supported Voice Commands (Strictly 3 Indonesian phrases):**
     1. `"Lanjut slide"` &rarr; triggers `NEXT_SLIDE`
     2. `"Slide sebelumnya"` &rarr; triggers `PREVIOUS_SLIDE`
     3. `"Slide [number]"` (e.g. "Slide 5") &rarr; triggers `GO_TO_SLIDE` (`slideNumber: 5`)
   - *Note: No other voice commands are recognized.*

---

## 4. Command Specifications & Schemas

All messages adhere to the `ProtocolMessage` envelope:

```typescript
interface ProtocolMessage<T = unknown> {
  id: string;             // UUID or unique request ID
  type: CommandType;      // Command identifier
  sessionId: string;      // Presentation session UUID
  deviceToken?: string;   // Approved device authorization token
  timestamp: number;      // Unix epoch milliseconds
  payload: T;             // Command-specific payload
}
```

### Command Types & Payloads

#### `NEXT_SLIDE`
Advances to the next presentation slide.
- **Payload:** `{}`

#### `PREVIOUS_SLIDE`
Goes to the previous presentation slide.
- **Payload:** `{}`

#### `GO_TO_SLIDE`
Jumps directly to a 1-indexed slide number.
- **Payload:**
```json
{
  "slideNumber": 7
}
```

#### `DRAW`
Transmits freehand drawing path vectors with normalized coordinates `[0.0, 1.0]`.
- **Payload:**
```json
{
  "points": [
    { "x": 0.452, "y": 0.312 },
    { "x": 0.459, "y": 0.320 }
  ],
  "color": "#e11d48",
  "strokeWidth": 3
}
```

#### `HIGHLIGHT`
Transmits semi-transparent highlighter strokes.
- **Payload:**
```json
{
  "points": [
    { "x": 0.200, "y": 0.600 },
    { "x": 0.800, "y": 0.600 }
  ],
  "color": "#facc15",
  "strokeWidth": 18,
  "opacity": 0.4
}
```

#### `LASER_POINTER`
Moves the virtual laser dot across the presentation canvas.
- **Payload:**
```json
{
  "x": 0.521,
  "y": 0.489,
  "visible": true
}
```

#### `ZOOM`
Magnifies a specific area of the current slide.
- **Payload:**
```json
{
  "scale": 1.75,
  "originX": 0.5,
  "originY": 0.5
}
```

#### `CLEAR_ANNOTATION`
Clears drawings and highlights for the current or specified slide.
- **Payload:**
```json
{
  "slideNumber": 3
}
```

#### `PRESENTATION_STATE`
Broadcast from Desktop host to controllers whenever slide changes or presentation mode toggles.
- **Payload:**
```json
{
  "currentSlide": 4,
  "totalSlides": 24,
  "isPresenting": true,
  "title": "Quarterly Strategy Review.pdf",
  "backgroundColor": "#09090b",
  "scaleMode": "contain"
}
```

#### `DEVICE_CONNECTED`
Sent upon successful connection.
- **Payload:**
```json
{
  "deviceId": "android-pixel8-xyz",
  "deviceName": "Hiro's Pixel 8 Pro",
  "mode": "remote"
}
```

#### `DEVICE_DISCONNECTED`
Sent on teardown or host session revocation.
- **Payload:**
```json
{
  "deviceId": "android-pixel8-xyz",
  "reason": "Host ended session"
}
```

---

## 5. Security & Validation Rules

1. All coordinates `(x, y)` **must be normalized** between `0.0` and `1.0` so they scale flawlessly across any projector or display resolution.
2. `strokeWidth` and `scale` are strictly bounded to prevent UI denial-of-service.
3. Every packet is validated through Zod runtime schema guards before being dispatched to the rendering canvas.
4. Paired devices can be revoked at any time by the desktop host.
