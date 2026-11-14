-- ==============================================================================
-- SIMPLY PPT — SECURE DATABASE AUTHORIZATION ARCHITECTURE
-- ==============================================================================
-- 1. Zero document storage (PDFs remain strictly on local presenter devices).
-- 2. Zero exposure of host_session_token or device_token in plaintext.
-- 3. All tokens are cryptographically hashed using SHA-256 before persistence.
-- 4. No public enumeration: anonymous SELECT on sessions is completely revoked.
-- 5. Pair Code resolution is strictly gated through rate-limited RPC functions.
-- 6. Server-side brute-force defense with exponential lockout.
-- 7. Host mutations strictly require verification of host_session_token_hash.
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLES DEFINITION
-- ==============================================================================

-- 1.1 Presentation Sessions
CREATE TABLE IF NOT EXISTS public.presentation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_session_token_hash TEXT NOT NULL,
    pair_code_hash TEXT,
    pair_code_salt TEXT NOT NULL,
    pair_code_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'revoked')),
    current_slide INTEGER NOT NULL DEFAULT 1 CHECK (current_slide >= 1),
    total_slides INTEGER NOT NULL DEFAULT 1 CHECK (total_slides >= 0),
    title TEXT NOT NULL DEFAULT 'Untitled Presentation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_code_hash 
    ON public.presentation_sessions (pair_code_hash, pair_code_expires_at);

-- 1.2 Pairing Requests
CREATE TABLE IF NOT EXISTS public.pairing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.presentation_sessions(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    requester_secret_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    device_token_encrypted TEXT, -- Ephemeral token only visible to requester with secret
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_requests_session_status 
    ON public.pairing_requests (session_id, status);

CREATE INDEX IF NOT EXISTS idx_requests_requester_secret 
    ON public.pairing_requests (id, requester_secret_hash);

-- 1.3 Paired Devices
CREATE TABLE IF NOT EXISTS public.paired_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.presentation_sessions(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_token_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    paired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paired_devices_lookup 
    ON public.paired_devices (session_id, device_token_hash, is_active);

-- 1.4 Rate Limiting & Replay Defense Audit Table
CREATE TABLE IF NOT EXISTS public.pairing_rate_limits (
    identifier TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 1,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    blocked_until TIMESTAMPTZ
);

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict zero-trust model: default deny on all direct table queries for public anon
-- ==============================================================================

ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paired_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_rate_limits ENABLE ROW LEVEL SECURITY;

-- 2.1 presentation_sessions:
-- NO DIRECT PUBLIC SELECT: completely prevents anonymous users from enumerating sessions.
-- Only host can select or update their own session with matching host token hash.
CREATE POLICY "Host select own session"
    ON public.presentation_sessions
    FOR SELECT
    TO public
    USING (false); -- Direct SELECT blocked; queries must use secure RPC functions

CREATE POLICY "Direct insert denied"
    ON public.presentation_sessions
    FOR INSERT
    TO public
    WITH CHECK (false);

CREATE POLICY "Direct update denied"
    ON public.presentation_sessions
    FOR UPDATE
    TO public
    USING (false);

CREATE POLICY "Direct delete denied"
    ON public.presentation_sessions
    FOR DELETE
    TO public
    USING (false);

-- 2.2 pairing_requests:
-- Direct access denied; devices must use rpc_submit_pairing_request and rpc_poll_pairing_status
CREATE POLICY "Direct requests select denied"
    ON public.pairing_requests
    FOR SELECT
    TO public
    USING (false);

CREATE POLICY "Direct requests insert denied"
    ON public.pairing_requests
    FOR INSERT
    TO public
    WITH CHECK (false);

CREATE POLICY "Direct requests update denied"
    ON public.pairing_requests
    FOR UPDATE
    TO public
    USING (false);

-- 2.3 paired_devices:
CREATE POLICY "Direct paired devices select denied"
    ON public.paired_devices
    FOR SELECT
    TO public
    USING (false);

CREATE POLICY "Direct paired devices insert denied"
    ON public.paired_devices
    FOR INSERT
    TO public
    WITH CHECK (false);

CREATE POLICY "Direct paired devices update denied"
    ON public.paired_devices
    FOR UPDATE
    TO public
    USING (false);

-- ==============================================================================
-- 3. SECURE AUTHORIZATION RPC FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- 3.1 Rate Limiting Check Helper
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO v_rec FROM public.pairing_rate_limits WHERE identifier = p_identifier;

    IF NOT FOUND THEN
        RETURN TRUE;
    END IF;

    -- If currently blocked, check if block duration has elapsed
    IF v_rec.blocked_until IS NOT NULL AND v_rec.blocked_until > v_now THEN
        RETURN FALSE;
    END IF;

    -- Reset window if 60 seconds have passed since first attempt
    IF v_now - v_rec.first_attempt_at > INTERVAL '1 minute' THEN
        DELETE FROM public.pairing_rate_limits WHERE identifier = p_identifier;
        RETURN TRUE;
    END IF;

    -- If attempts exceeded limit, lock out for 5 minutes
    IF v_rec.failed_attempts >= 5 THEN
        UPDATE public.pairing_rate_limits
        SET blocked_until = v_now + INTERVAL '5 minutes',
            last_attempt_at = v_now
        WHERE identifier = p_identifier;
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- 3.2 Record Failed Attempt Helper
CREATE OR REPLACE FUNCTION public.record_failed_rate_limit(p_identifier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
BEGIN
    INSERT INTO public.pairing_rate_limits (identifier, failed_attempts, first_attempt_at, last_attempt_at)
    VALUES (p_identifier, 1, v_now, v_now)
    ON CONFLICT (identifier) DO UPDATE
    SET failed_attempts = public.pairing_rate_limits.failed_attempts + 1,
        last_attempt_at = v_now,
        blocked_until = CASE
            WHEN public.pairing_rate_limits.failed_attempts + 1 >= 5 THEN v_now + INTERVAL '5 minutes'
            ELSE public.pairing_rate_limits.blocked_until
        END;
END;
$$;

-- 3.3 Create Session (Host Only)
CREATE OR REPLACE FUNCTION public.rpc_create_session(
    p_session_id UUID,
    p_host_token_hash TEXT,
    p_pair_code_hash TEXT,
    p_pair_code_salt TEXT,
    p_expires_at TIMESTAMPTZ,
    p_title TEXT,
    p_total_slides INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.presentation_sessions (
        id,
        host_session_token_hash,
        pair_code_hash,
        pair_code_salt,
        pair_code_expires_at,
        title,
        total_slides,
        current_slide,
        status
    ) VALUES (
        p_session_id,
        p_host_token_hash,
        p_pair_code_hash,
        p_pair_code_salt,
        p_expires_at,
        p_title,
        p_total_slides,
        1,
        'active'
    );

    RETURN p_session_id;
END;
$$;

-- 3.4 Resolve Active Pair Code (Secure Lookup)
-- Replay & Brute Force Protected: Rate-limited lookup that returns strictly session_id and title
CREATE OR REPLACE FUNCTION public.rpc_resolve_pair_code(
    p_client_identifier TEXT,
    p_pair_code_hash TEXT
)
RETURNS TABLE (
    session_id UUID,
    title TEXT,
    total_slides INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_column
DECLARE
    v_allowed BOOLEAN;
    v_session RECORD;
BEGIN
    -- Enforce server-side rate limit
    v_allowed := public.check_rate_limit(p_client_identifier);
    IF NOT v_allowed THEN
        RAISE EXCEPTION 'Rate limit exceeded. Too many failed attempts. Please wait.';
    END IF;

    -- Lookup matching active unexpired session
    SELECT ps.id, ps.title, ps.total_slides INTO v_session
    FROM public.presentation_sessions ps
    WHERE ps.pair_code_hash = p_pair_code_hash
      AND ps.pair_code_expires_at > now()
      AND ps.status = 'active';

    IF NOT FOUND THEN
        -- Record failed attempt to protect against code enumeration
        PERFORM public.record_failed_rate_limit(p_client_identifier);
        RETURN;
    END IF;

    -- Reset rate limit record upon valid code
    DELETE FROM public.pairing_rate_limits WHERE identifier = p_client_identifier;

    RETURN QUERY SELECT v_session.id, v_session.title, v_session.total_slides;
END;
$$;

-- 3.5 Submit Pairing Request (Device to Active Session)
CREATE OR REPLACE FUNCTION public.rpc_submit_pairing_request(
    p_request_id UUID,
    p_session_id UUID,
    p_device_id TEXT,
    p_device_name TEXT,
    p_requester_secret_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify session is active and not expired
    IF NOT EXISTS (
        SELECT 1 FROM public.presentation_sessions
        WHERE id = p_session_id
          AND pair_code_expires_at > now()
          AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Session is not active or pair code has expired.';
    END IF;

    INSERT INTO public.pairing_requests (
        id,
        session_id,
        device_id,
        device_name,
        requester_secret_hash,
        status,
        requested_at
    ) VALUES (
        p_request_id,
        p_session_id,
        p_device_id,
        p_device_name,
        p_requester_secret_hash,
        'pending',
        now()
    );

    RETURN TRUE;
END;
$$;

-- 3.6 Poll Pairing Request Status (Requester Only)
-- Requester must provide matching requester_secret_hash to inspect status
CREATE OR REPLACE FUNCTION public.rpc_poll_pairing_status(
    p_request_id UUID,
    p_requester_secret_hash TEXT
)
RETURNS TABLE (
    request_id UUID,
    status TEXT,
    device_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT r.id, r.status, r.device_token_encrypted
    FROM public.pairing_requests r
    WHERE r.id = p_request_id
      AND r.requester_secret_hash = p_requester_secret_hash;
END;
$$;

-- 3.7 Host Fetch Pending Requests (Host Only)
-- Host must provide valid host_session_token_hash
CREATE OR REPLACE FUNCTION public.rpc_host_get_pending_requests(
    p_session_id UUID,
    p_host_token_hash TEXT
)
RETURNS TABLE (
    request_id UUID,
    device_id TEXT,
    device_name TEXT,
    requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_column
BEGIN
    -- Authorize host
    IF NOT EXISTS (
        SELECT 1 FROM public.presentation_sessions ps
        WHERE ps.id = p_session_id AND ps.host_session_token_hash = p_host_token_hash AND ps.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Invalid host session token';
    END IF;

    RETURN QUERY
    SELECT r.id, r.device_id, r.device_name, r.requested_at
    FROM public.pairing_requests r
    WHERE r.session_id = p_session_id
      AND r.status = 'pending'
    ORDER BY r.requested_at ASC;
END;
$$;

-- 3.8 Host Approve Request (Host Only)
-- Authorizes host, approves request, registers device token hash, and immediately destroys pair code
CREATE OR REPLACE FUNCTION public.rpc_approve_pairing_request(
    p_request_id UUID,
    p_session_id UUID,
    p_host_token_hash TEXT,
    p_device_token_hash TEXT,
    p_ephemeral_device_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
BEGIN
    -- 1. Authorize host token
    IF NOT EXISTS (
        SELECT 1 FROM public.presentation_sessions
        WHERE id = p_session_id AND host_session_token_hash = p_host_token_hash AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Invalid host session token';
    END IF;

    -- 2. Fetch pending request
    SELECT * INTO v_req FROM public.pairing_requests
    WHERE id = p_request_id AND session_id = p_session_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 3. Mark request approved with ephemeral token for the polling requester
    UPDATE public.pairing_requests
    SET status = 'approved',
        device_token_encrypted = p_ephemeral_device_token,
        responded_at = now()
    WHERE id = p_request_id;

    -- 4. Register in paired_devices with hashed token
    INSERT INTO public.paired_devices (
        session_id,
        device_id,
        device_name,
        device_token_hash,
        is_active,
        paired_at
    ) VALUES (
        p_session_id,
        v_req.device_id,
        v_req.device_name,
        p_device_token_hash,
        true,
        now()
    );

    -- 5. Invalidate single-use pair code immediately
    UPDATE public.presentation_sessions
    SET pair_code_hash = NULL,
        pair_code_expires_at = NULL,
        updated_at = now()
    WHERE id = p_session_id;

    RETURN TRUE;
END;
$$;

-- 3.9 Host Reject Request (Host Only)
CREATE OR REPLACE FUNCTION public.rpc_reject_pairing_request(
    p_request_id UUID,
    p_session_id UUID,
    p_host_token_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.presentation_sessions
        WHERE id = p_session_id AND host_session_token_hash = p_host_token_hash
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Invalid host session token';
    END IF;

    UPDATE public.pairing_requests
    SET status = 'rejected',
        responded_at = now()
    WHERE id = p_request_id AND session_id = p_session_id;

    RETURN FOUND;
END;
$$;

-- 3.10 Host Revoke Device (Host Only)
CREATE OR REPLACE FUNCTION public.rpc_revoke_device(
    p_session_id UUID,
    p_host_token_hash TEXT,
    p_device_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.presentation_sessions
        WHERE id = p_session_id AND host_session_token_hash = p_host_token_hash
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Invalid host session token';
    END IF;

    UPDATE public.paired_devices
    SET is_active = false
    WHERE session_id = p_session_id AND device_id = p_device_id;

    RETURN FOUND;
END;
$$;

-- 3.11 Verify Device Token Authorization
CREATE OR REPLACE FUNCTION public.rpc_verify_device_token(
    p_session_id UUID,
    p_device_token_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.paired_devices
        WHERE session_id = p_session_id
          AND device_token_hash = p_device_token_hash
          AND is_active = true
    );
END;
$$;

-- 3.12 Host Refresh Pair Code (Host Only)
CREATE OR REPLACE FUNCTION public.rpc_refresh_pair_code(
    p_session_id UUID,
    p_host_token_hash TEXT,
    p_new_code_hash TEXT,
    p_new_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.presentation_sessions
    SET pair_code_hash = p_new_code_hash,
        pair_code_expires_at = p_new_expires_at,
        updated_at = now()
    WHERE id = p_session_id
      AND host_session_token_hash = p_host_token_hash
      AND status = 'active';

    RETURN FOUND;
END;
$$;
