# Security Policy — Simply PPT

Simply PPT is built with a security-first architecture designed to keep presentation documents private, local, and completely protected from cloud exposure.

## Core Security Tenets

1. **Local-First Document Privacy:**
   - Presentation files (PDFs) are **never uploaded to Supabase or any third-party cloud service**.
   - All presentation rendering occurs locally in the user's browser using on-device PDF rendering.
   - Cached documents and presentation metadata are stored strictly in the client's local IndexedDB.

2. **Cross-Network Cloud Pairing Architecture:**
   - Pair codes are 6-digit numeric codes generated using cryptographically secure random values (`crypto.getRandomValues`).
   - Pair codes strictly expire after **3 minutes (180 seconds)**.
   - Pair codes are single-use and invalidated immediately upon pairing or expiration.
   - Failed pairing attempts are rate-limited to mitigate brute-force attacks.
   - **Mandatory Host Approval:** A pairing request cannot connect until the desktop host explicitly approves the device in a visual approval modal.

3. **Supabase & Credential Boundaries:**
   - The application strictly uses public client credentials (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - The `service_role` secret key is **NEVER** embedded, exposed, or committed to the repository.
   - Database operations are protected with PostgreSQL Row Level Security (RLS) policies.
   - Realtime channels use authenticated device tokens and strict session-level isolation.
   - Session revocation: the desktop host can disconnect or revoke any paired device at any time.

4. **Local Network & Safe Error Handling:**
   - The local dev/production server binds to `127.0.0.1` by default.
   - File uploads are validated via binary magic numbers (`%PDF-`), mime-type checks, and size thresholds.
   - User inputs and remote command payloads are validated against strict Zod schemas before execution.
   - Detailed stack traces and system paths are never leaked to paired clients.

## Reporting a Vulnerability

If you discover a security vulnerability within Simply PPT, please disclose it responsibly:
- Email the project maintainer at `abiyuhilal943@gmail.com` with the subject `[SECURITY] Simply PPT Vulnerability Report`.
- Include reproducible steps and proof-of-concept details.
- Please allow adequate time for investigation and patch deployment before public disclosure.
