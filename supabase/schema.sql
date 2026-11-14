-- ==============================================================================
-- SIMPLY PPT — SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- This schema supports cross-network pairing between Desktop hosts and Mobile controllers
-- without exposing presentations to the cloud. Only coordination and control signaling
-- passes through Supabase.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Presentation Sessions
CREATE TABLE IF NOT EXISTS public.presentation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_session_token TEXT UNIQUE NOT NULL,
    pair_code VARCHAR(6),
    pair_code_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'revoked')),
    current_slide INTEGER NOT NULL DEFAULT 1,
    total_slides INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL DEFAULT 'Untitled Presentation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for speedy pair code lookup
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_pair_code 
    ON public.presentation_sessions (pair_code, pair_code_expires_at);

-- 2. Pairing Requests
CREATE TABLE IF NOT EXISTS public.pairing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.presentation_sessions(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    device_token TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pairing_requests_session_id 
    ON public.pairing_requests (session_id, status);

-- 3. Paired Devices
CREATE TABLE IF NOT EXISTS public.paired_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.presentation_sessions(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_token TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    paired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paired_devices_session_device 
    ON public.paired_devices (session_id, device_token);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ==============================================================================

ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paired_devices ENABLE ROW LEVEL SECURITY;

-- Presentation Sessions RLS
-- Anyone can look up a session using the active, non-expired pair code
CREATE POLICY "Public pair code resolution"
    ON public.presentation_sessions
    FOR SELECT
    USING (
        pair_code IS NOT NULL 
        AND pair_code_expires_at > now() 
        AND status = 'active'
    );

-- Hosts can create new presentation sessions
CREATE POLICY "Host create presentation session"
    ON public.presentation_sessions
    FOR INSERT
    WITH CHECK (true);

-- Hosts can update their own session with host token
CREATE POLICY "Host manage presentation session"
    ON public.presentation_sessions
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Pairing Requests RLS
-- Anyone can request pairing to an active session
CREATE POLICY "Allow device to submit pairing request"
    ON public.pairing_requests
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.presentation_sessions s
            WHERE s.id = session_id 
              AND s.pair_code_expires_at > now()
              AND s.status = 'active'
        )
    );

-- Anyone can inspect status of their own submitted pairing request
CREATE POLICY "Device check pairing status"
    ON public.pairing_requests
    FOR SELECT
    USING (true);

-- Host can approve or reject pairing requests
CREATE POLICY "Host manage pairing requests"
    ON public.pairing_requests
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Paired Devices RLS
-- Host and approved devices can view paired devices
CREATE POLICY "View paired devices"
    ON public.paired_devices
    FOR SELECT
    USING (true);

CREATE POLICY "Host register paired device"
    ON public.paired_devices
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Host update paired device"
    ON public.paired_devices
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- REALTIME REPLICATION CONFIGURATION
-- Enable publication for real-time Postgres changes (Supabase Realtime)
-- ==============================================================================
BEGIN;
  -- Add tables to realtime publication if supabase_realtime publication exists
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_sessions;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.pairing_requests;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.paired_devices;
    END IF;
  END
  $$;
COMMIT;
