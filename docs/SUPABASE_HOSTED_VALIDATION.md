# Supabase Hosted Database Validation Checklist & Security Audit

This document provides the mandatory validation procedure for deploying and validating Simply PPT's security architecture against a live, hosted Supabase instance (cloud or self-hosted).

---

## 1. Migration Safety & Idempotency Audit

The migration file [supabase/migrations/20261114000000_security_hardening.sql](file:///mnt/d/simply-ppt/supabase/migrations/20261114000000_security_hardening.sql) was audited for non-destructive operations:

- **Zero Data Loss**: Contains no `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` operations.
- **Idempotency**:
  - Tables use `CREATE TABLE IF NOT EXISTS`.
  - Indexes use `CREATE INDEX IF NOT EXISTS`.
  - Functions use `CREATE OR REPLACE FUNCTION`.
  - Policies use `DROP POLICY IF EXISTS <policy> ON <table>; CREATE POLICY <policy> ON <table> ...`.
- **Privilege Revocation**: Explicitly revokes `CREATE` privilege on schema `public` from untrusted roles (`PUBLIC`, `anon`, `authenticated`).
- **Search Path Lockdown**: Enforces `SET search_path = pg_catalog, public` on all 12 `SECURITY DEFINER` functions.

---

## 2. Hosted Validation Checklist

When deploying to a live Supabase project, execute the following validation steps sequentially.

### Step 1: Run the Migration
In your Supabase Dashboard:
1. Navigate to **SQL Editor** -> **New Query**.
2. Paste the contents of `supabase/migrations/20261114000000_security_hardening.sql`.
3. Click **Run**.
4. Confirm message: `Success. No rows returned`.

---

### Step 2: Verify Schema Privileges
Execute the following verification query in the SQL Editor:

```sql
SELECT 
    has_schema_privilege('anon', 'public', 'CREATE') AS anon_can_create,
    has_schema_privilege('authenticated', 'public', 'CREATE') AS authenticated_can_create,
    has_schema_privilege('public', 'public', 'CREATE') AS public_can_create;
```

**Expected Result:**
| anon_can_create | authenticated_can_create | public_can_create |
|---|---|---|
| `false` | `false` | `false` |

*(If any value is `true`, execute `REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;`)*.

---

### Step 3: Verify Function Search Paths
Execute the following verification query to ensure all `SECURITY DEFINER` functions have pinned search paths:

```sql
SELECT 
    proname AS function_name,
    prosecdef AS is_security_definer,
    proconfig AS configuration
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND prosecdef = true
ORDER BY proname;
```

**Expected Result:**
All 12 functions (`check_rate_limit`, `record_failed_rate_limit`, `rpc_create_session`, `rpc_resolve_pair_code`, `rpc_submit_pairing_request`, `rpc_poll_pairing_status`, `rpc_host_get_pending_requests`, `rpc_approve_pairing_request`, `rpc_reject_pairing_request`, `rpc_revoke_device`, `rpc_verify_device_token`, `rpc_refresh_pair_code`) MUST have:
- `is_security_definer` = `true`
- `configuration` = `{"search_path=pg_catalog, public"}`

---

### Step 4: Verify Default-Deny Row Level Security (RLS)
Execute the following query as the `anon` role:

```sql
SET ROLE anon;

-- Direct queries MUST return 0 rows
SELECT count(*) FROM public.presentation_sessions;
SELECT count(*) FROM public.pairing_requests;
SELECT count(*) FROM public.paired_devices;
SELECT count(*) FROM public.pairing_rate_limits;

-- Direct mutations MUST fail
INSERT INTO public.presentation_sessions (host_session_token_hash, pair_code_salt) VALUES ('test', 'salt');

RESET ROLE;
```

**Expected Result:**
- All `count(*)` queries return `0`.
- The `INSERT` query throws: `ERROR: new row violates row-level security policy for table "presentation_sessions"`.

---

### Step 5: Verify Server-Side Rate Limiting
Execute 6 invalid code resolution attempts in the SQL Editor:

```sql
SET ROLE anon;
SELECT * FROM public.rpc_resolve_pair_code('test-client-ip', 'invalid_code_hash_1');
SELECT * FROM public.rpc_resolve_pair_code('test-client-ip', 'invalid_code_hash_2');
SELECT * FROM public.rpc_resolve_pair_code('test-client-ip', 'invalid_code_hash_3');
SELECT * FROM public.rpc_resolve_pair_code('test-client-ip', 'invalid_code_hash_4');
SELECT * FROM public.rpc_resolve_pair_code('test-client-ip', 'invalid_code_hash_5');
-- Attempt 6 MUST throw
SELECT * FROM public.rpc_resolve_pair_code('test-client-ip', 'invalid_code_hash_6');
RESET ROLE;
```

**Expected Result:**
Attempt 6 throws: `ERROR: Rate limit exceeded. Too many failed attempts. Please wait.`

---

### Step 6: Environment Credentials Hygiene
- Store only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- **NEVER** expose the `service_role` key in client code, environment variables, or commit history.
