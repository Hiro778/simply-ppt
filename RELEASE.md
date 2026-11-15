# Simply PPT — Release v1.0.0 Certification & Architecture Guide

**Release Version:** `1.0.0`  
**Certification Date:** November 15, 2026  
**Repository:** [github.com/Hiro778/simply-ppt](https://github.com/Hiro778/simply-ppt)  
**Security Status:** Audited, Hardened, and Verified (Zero Trust Architecture)

---

## 1. Release Deliverables

| Component | Target Platform | Version / Identifier | Integrity / Checksum |
|---|---|---|---|
| **Web Presentation System** | Next.js 16 (Turbopack) | `1.0.0` | Node.js 20+, zero-document upload architecture |
| **Android Remote Controller** | Android (APK) | `com.hiro.simplyppt` (v1.0.0, code 1) | SHA-256: `e7c986e7b1caf50998fac947c1348fbac2ef86b734a1902c0186e7e73b9d9320` |
| **Database Authorization Schema** | PostgreSQL (Supabase) | `20261114000000_security_hardening.sql` | Strict default-deny RLS, `search_path = pg_catalog, public` |
| **Shared Protocol** | Monorepo Package (`@simply-ppt/protocol`) | `1.0.0` | Zod runtime validated typed RPC/Realtime envelope |

---

## 2. Security Architecture & Threat Model

### 2.1 Zero-Document Storage Principle
- Presentation slides (PDF documents) are rendered entirely in the presenter's client browser using local Web Workers (`pdfjs-dist`).
- **No slide files, images, or document contents are ever transmitted to or stored on any server or cloud database.**

### 2.2 Ephemeral Pairing Protocol
- Presentation sessions generate a 6-digit cryptographic Pair Code with a 3-minute sliding window expiration.
- Controllers register with an ephemeral requester secret hash.
- Host explicitly approves or rejects pairing requests.
- Single-use guarantee: the Pair Code is invalidated immediately upon successful device approval.
- Server-side brute-force lockout: after 5 failed code resolution attempts, the identifier is locked out for 5 minutes.

### 2.3 Cryptographic Token Storage
- Neither `host_session_token` nor `device_token` are ever stored in plaintext.
- All tokens are hashed using SHA-256 before persistence in PostgreSQL.
- The PostgreSQL public schema has `CREATE` privileges revoked from untrusted roles (`PUBLIC`, `anon`, `authenticated`).
- All 12 `SECURITY DEFINER` RPC functions enforce strict search paths:
  ```sql
  SET search_path = pg_catalog, public
  ```

### 2.4 Realtime Broadcast Anti-Spoofing
- Host-level notifications (`PRESENTATION_STATE`, `DEVICE_CONNECTED`, `DEVICE_DISCONNECTED`) sent over public Realtime WebSocket channels are strictly discarded by host listeners to prevent unauthorized state manipulation.
- Mobile controllers verify that `DEVICE_DISCONNECTED` notifications explicitly match their local device ID before terminating sessions.
- Revoking one device does not affect or revoke other concurrently paired devices.

### 2.5 Android Native Hardening
- `android:allowBackup="false"` to prevent unauthorized extraction of stored device tokens via ADB backup.
- `android:usesCleartextTraffic="false"` and `network_security_config.xml` to prevent unencrypted HTTP communication.
- XML data extraction rules (`secure_store_data_extraction_rules.xml`) protecting Android 12+ keystore records.
- Exclusion of dangerous overlay permissions (`SYSTEM_ALERT_WINDOW`).
- APK signed with APK Signature Scheme v2 & v3 (Certificate SHA-256: `dc35795c37c468d3ff92aa32c608f15f2f2456deb9a924576e2e2fb97ad9e708`, Subject: `CN=Simply PPT Release, O=Simply PPT, C=ID`).

---

## 3. Supported Protocol Commands

| Command | Sender | Description |
|---|---|---|
| `NEXT_SLIDE` | Mobile | Advance presentation to the next slide |
| `PREVIOUS_SLIDE` | Mobile | Return to the preceding slide |
| `GO_TO_SLIDE` | Mobile | Jump to a specific slide number (1 to N) |
| `BLACKOUT` | Mobile / Desktop | Toggle screen blackout (`B` key) |
| `WHITEOUT` | Mobile / Desktop | Toggle screen whiteout (`W` key) |
| `DRAW` | Mobile | Stream real-time pen strokes onto presenter canvas |
| `HIGHLIGHT` | Mobile | Semi-transparent highlighter annotations |
| `LASER_POINTER` | Mobile | Real-time normalized (X, Y) pointer coordinates |
| `ZOOM` | Mobile | Pinch-to-zoom coordinates with pan offset |
| `CLEAR_ANNOTATION` | Mobile | Clear annotations on current or all slides |
| `PRESENTATION_STATE` | Desktop Host | Broadcast current slide index, count, and shading mode |
| `DEVICE_CONNECTED` | Desktop Host | Announce newly approved paired controller |
| `DEVICE_DISCONNECTED` | Desktop Host | Notify controller of host-initiated revocation |

---

## 4. Verification Suite Results

```
├── Web Vitest Suite:        8/8 files, 61/61 tests PASSED
├── Mobile Jest Suite:       3/3 suites, 22/22 tests PASSED
├── TypeScript Typecheck:    Root 0 errors, Mobile 0 errors
├── Code Linting:            0 errors, 0 warnings
├── Dependency Audit:        0 known vulnerabilities
└── Production Web Build:    Compiled with Next.js Turbopack, 4/4 static pages
```
