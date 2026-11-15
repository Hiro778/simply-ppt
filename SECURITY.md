# Security Policy & Hardening Guide — Simply PPT

Simply PPT is built with a zero-trust, security-first architecture designed to keep presentation documents private, local, and completely protected from cloud exposure.

---

## 1. Core Security Tenets

1. **Local-First Document Privacy:**
   - Presentation files (PDFs) are **never uploaded to Supabase or any third-party cloud service**.
   - All presentation rendering occurs locally in the user's browser using on-device PDF rendering.
   - Cached documents and presentation metadata are stored strictly in the client's local IndexedDB.

2. **Cross-Network Cloud Pairing Architecture:**
   - Pair codes are 6-digit numeric codes generated using cryptographically secure random values (`crypto.getRandomValues`).
   - Pair codes strictly expire after **3 minutes (180 seconds)**.
   - Pair codes are single-use and invalidated immediately upon device approval or expiration.
   - Failed pairing attempts are rate-limited with exponential backoff and lockout to mitigate brute-force enumeration.
   - **Mandatory Host Approval:** A pairing request cannot connect until the desktop host explicitly approves the device in a visual approval modal.

3. **Supabase & Credential Boundaries:**
   - The application strictly uses public client credentials (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - The `service_role` secret key is **NEVER** embedded, exposed, or committed to the repository.
   - Database operations are protected with PostgreSQL Row Level Security (RLS) policies and `SECURITY DEFINER` RPC functions with explicit cryptographic verification.
   - Realtime channels enforce session boundary isolation and bearer device token verification on every message.
   - Session revocation: the desktop host can disconnect or revoke any paired device at any time, immediately disabling command dispatch.

4. **Local Network & Safe Error Handling:**
   - The local dev/production server binds to `127.0.0.1` by default.
   - File uploads are validated via binary magic numbers (`%PDF-`), mime-type checks, and size thresholds.
   - User inputs and remote command payloads are validated against strict Zod schemas before execution.
   - Detailed stack traces and system paths are never leaked to paired clients.

---

## 2. Post-Phase 1 Security Audit & Remediation

During the Post-Phase 1 security audit, critical vulnerabilities were identified in the initial Supabase schema and pairing mechanisms. The following remediation measures were designed and verified:

### A. Vulnerabilities Identified and Remediated

| Vulnerability | Initial State | Remediated State |
| :--- | :--- | :--- |
| **Overly Permissive RLS** | `USING (true)` and `WITH CHECK (true)` on `presentation_sessions`, `pairing_requests`, and `paired_devices`. | **Default-Deny Model**: All direct `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access for anonymous/public users is completely denied (`USING (false)` / `WITH CHECK (false)`). |
| **Plaintext Host Secrets** | `host_session_token` stored as raw plaintext in database table; exposed via public SELECT. | `host_session_token_hash` stored as SHA-256 hash. Host token is only held locally in host browser memory. Direct table SELECT is revoked. |
| **Plaintext Device Secrets** | `device_token` stored as plaintext in `pairing_requests` and `paired_devices`. | Device tokens are hashed using SHA-256 (`device_token_hash`). Requester poll uses `requester_secret_hash`. |
| **Session Enumeration** | Anonymous users could query `SELECT * FROM presentation_sessions` to discover all active sessions. | Blocked completely. Sessions can only be resolved via 6-digit pair code through the rate-limited RPC `rpc_resolve_pair_code`. |
| **Unauthorized Session Mutations** | Direct UPDATE allowed anyone to modify slides, title, or status without authorization. | Direct UPDATE is blocked. Pair code refreshing and device revocation require verification of `host_session_token_hash`. |
| **Brute-Force Pair Code Enumeration** | An attacker could rapidly guess 6-digit codes against the database. | Server-side rate limiting (`pairing_rate_limits` table) locks out an IP/client identifier for 5 minutes after 5 failed attempts. |
| **PostgreSQL Search Path Hijacking** | `SECURITY DEFINER` functions executed without explicit `search_path`, vulnerable to schema shadowing. | All 12 `SECURITY DEFINER` functions explicitly pinned with `SET search_path = public, pg_temp`. |
| **Realtime Broadcast Host Event Spoofing** | External subscribers could inject fake host notifications (`PRESENTATION_STATE`, `DEVICE_DISCONNECTED`) over the public WebSocket bus. | Incoming Realtime listener on the desktop host drops unauthorized host-type events received on the channel. |
| **Revoked Device Command Leak** | Revoked devices could still broadcast messages over Realtime channels. | Realtime command dispatch verifies `is_active` status and `device_token`. Commands from revoked tokens are dropped immediately. |

---

## 3. Detailed Authorization Architecture

### A. Database RLS & Security Definer RPC Model
Because direct table queries are blocked for `anon` and `authenticated` roles, all legitimate interactions are mediated through audited `SECURITY DEFINER` PostgreSQL functions:

1. `rpc_create_session`: Creates a new session with salted SHA-256 host token hash and pair code hash.
2. `rpc_resolve_pair_code`: Resolves a 6-digit code to session ID. Enforces server-side rate-limiting and 3-minute TTL check.
3. `rpc_submit_pairing_request`: Mobile client submits a pairing request with a client-generated `requester_secret_hash`.
4. `rpc_poll_pairing_status`: Requester polls request status using their `requester_secret_hash` without exposing other requests or tokens.
5. `rpc_host_get_pending_requests`: Desktop host retrieves pending requests only after validating `host_session_token_hash`.
6. `rpc_approve_pairing_request`: Host approves a pending device, registers `device_token_hash`, and immediately invalidates the single-use pair code.
7. `rpc_reject_pairing_request`: Host rejects pending request.
8. `rpc_revoke_device`: Host revokes a device by setting `is_active = false`.
9. `rpc_verify_device_token`: Fast verification query checking that a device token is active for the specified session.
10. `rpc_refresh_pair_code`: Host regenerates pair code with a fresh 3-minute expiration, authenticated by `host_token_hash`.

### B. Realtime Channel Authorization vs. Database RLS
Supabase Realtime broadcast channels operate over WebSockets independently of database RLS. To secure Realtime communications:
- **Session-Isolated Channels:** Realtime channels are namespaced by session UUID (`session:${sessionId}`), which cannot be enumerated.
- **Bearer Device Token Verification:** Every control command transmitted over Realtime must contain a valid `deviceToken` in its `ProtocolMessage` envelope.
- **Realtime Command Gate:** On receipt of any broadcast command, the presenter host verifies the token against the active paired device registry. If a device has been revoked or the token does not belong to this session, the command is immediately dropped with a security alert.

---

## 4. Frontend & Application Hardening

### A. HTTP Security Headers & Content Security Policy (CSP)
Configured in `next.config.ts`:
- **Content-Security-Policy:** Restricts script execution to local assets and trusted blob workers, disallows frame embedding (`frame-ancestors 'none'`), and limits connection targets to `127.0.0.1`, Supabase domains, and CDN fonts.
- **X-Frame-Options:** `DENY` prevents clickjacking attacks.
- **X-Content-Type-Options:** `nosniff` prevents MIME-sniffing exploits.
- **Referrer-Policy:** `strict-origin-when-cross-origin` protects sensitive URL paths.
- **Cross-Origin-Opener-Policy:** `same-origin` ensures browsing context isolation.
- **Permissions-Policy:** Disables unused browser device APIs (camera, microphone, geolocation).

### B. Memory-Safe Rate Limiter with Auto-Pruning
- The pairing rate limiter (`PairingRateLimiter`) enforces a strict capacity bound (`MAX_RATE_LIMIT_RECORDS = 5000`) and automatically purges expired/stale records to prevent memory exhaustion Denial-of-Service attacks.

### C. Bounded Protocol Payloads
- Input schemas (`src/lib/protocol/types.ts`) enforce strict upper bounds on vector coordinates (`points.max(1000)`), slide numbers (`max(10000)`), text lengths, and timestamps to eliminate CPU or thread starvation attacks from malicious controller packets.

### D. Hardened PDF Execution Sandbox
- PDF.js engine is explicitly configured with `isEvalSupported: false` and `enableScripting: false`, preventing any embedded malicious JavaScript within uploaded PDFs from running.

---

## 5. Security Test Suite Verification

Database authorization and security boundaries are validated through automated database tests (`tests/security/database-authorization.test.ts`) executed against an actual PostgreSQL engine:

- [x] **Anonymous user cannot retrieve host tokens** (direct SELECT on `presentation_sessions` blocked by RLS).
- [x] **Anonymous user cannot retrieve device tokens** (direct SELECT on `paired_devices` and `pairing_requests` blocked by RLS).
- [x] **Unauthorized user cannot modify presentation sessions** (direct UPDATE blocked by RLS; RPC refresh with fake host hash rejected).
- [x] **Unauthorized user cannot approve pairing requests** (`rpc_approve_pairing_request` raises unauthorized exception when presented with invalid host token).
- [x] **Expired Pair Code cannot establish a session** (`rpc_resolve_pair_code` returns 0 rows; `rpc_submit_pairing_request` rejects expired session).
- [x] **Revoked devices immediately lose access** (`rpc_verify_device_token` returns false immediately upon host revocation).
- [x] **A device cannot access another session** (Token approved for Session A is rejected when targeting Session B).
- [x] **Valid approved devices authenticate commands** (`rpc_verify_device_token` confirms authentic active devices).
- [x] **Server-side rate limiting locks out brute-force attacks** (5 failed pair code attempts trigger a 5-minute lockout).
- [x] **Realtime command gate drops revoked device messages** (broadcast commands from revoked device tokens are ignored).
- [x] **Realtime command gate isolates sessions** (cross-session messages are dropped).

---

## 6. Reporting a Vulnerability

If you discover a security vulnerability within Simply PPT, please disclose it responsibly:
- Email the project maintainer at `abiyuhilal943@gmail.com` with the subject `[SECURITY] Simply PPT Vulnerability Report`.
- Include reproducible steps and proof-of-concept details.
- Please allow adequate time for investigation and patch deployment before public disclosure.
