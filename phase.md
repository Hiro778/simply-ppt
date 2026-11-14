# SIMPLY PPT — POST-PHASE 1 SECURITY AUDIT & HARDENING

Do not start Phase 2.

Perform a focused security remediation of the existing Simply PPT repository.

Repository:
https://github.com/Hiro778/simply-ppt

## CRITICAL FINDINGS

The current `supabase/schema.sql` contains overly permissive RLS policies, including:

- `USING (true)`
- `WITH CHECK (true)`

Affected tables:

- presentation_sessions
- pairing_requests
- paired_devices

Sensitive values currently exist in these tables:

- host_session_token
- device_token
- pair_code

These must never be exposed through unrestricted anonymous SELECT policies.

## REQUIRED FIXES

1. Redesign RLS policies using explicit ownership and authorization boundaries.
2. Never expose host_session_token through public session lookup.
3. Never expose device_token through unrestricted pairing request or device queries.
4. Restrict UPDATE and DELETE operations to authorized session owners.
5. Restrict pairing request inspection to the relevant requester and host.
6. Ensure revoked devices immediately lose access.
7. Prevent anonymous users from enumerating active presentation sessions.
8. Implement secure Pair Code resolution through a trusted server-side Edge Function or appropriately secured RPC.
9. Store sensitive pairing credentials securely; prefer hashed short-lived pairing codes where appropriate.
10. Add server-side rate limiting and replay protection.
11. Review Realtime channel authorization separately from database RLS.
12. Never expose service_role credentials in browser code.

## SECURITY TESTING

Create actual database authorization tests for:

- Anonymous user cannot retrieve host tokens.
- Anonymous user cannot retrieve device tokens.
- Unauthorized user cannot modify presentation sessions.
- Unauthorized user cannot approve pairing requests.
- Expired Pair Code cannot establish a session.
- Revoked devices cannot send commands.
- A device cannot access another session.
- Valid approved devices can send authorized commands.

Use separate test identities and the public anon key to verify actual authorization behavior.

Do not treat passing mocked unit tests as proof of database security.

## DOCUMENTATION

Update:

- SECURITY.md
- README.md
- supabase/schema.sql
- Supabase setup documentation.

Document the new authorization architecture.

## GITHUB

Run all existing tests plus new security tests.

Run typecheck, lint, production build and dependency audit.

Commit and push the fixes to the existing main branch.

Never force-push.

## FINAL REPORT

Report:

- Exact vulnerabilities fixed.
- Before/after RLS policy behavior.
- Database security test results.
- Realtime authorization results.
- Commit hash.
- GitHub push verification.
- Remaining limitations.

STOP after the security audit.

Do not develop Android APK yet.
