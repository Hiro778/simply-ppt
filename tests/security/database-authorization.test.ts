import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { pairingService, localStore } from '@/lib/supabase/service';
import {
  hashHostToken,
  hashPairCode,
  hashDeviceToken,
  hashRequesterSecret,
  generateSecureToken,
  generateSalt,
} from '@/lib/crypto/hash';
import { ProtocolMessage } from '@/lib/protocol/types';

describe('Database Authorization & Security Boundaries (PostgreSQL RLS & RPC)', () => {
  let db: PGlite;

  beforeAll(async () => {
    // 1. Initialize genuine PostgreSQL WebAssembly engine
    db = new PGlite();

    // 2. Configure standard Supabase database roles
    await db.exec(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
      END $$;
    `);

    // 3. Load and execute the production Supabase schema
    const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    // Strip external extension statements if not compiled in wasm bundle
    schemaSql = schemaSql.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '-- EXTENSION uuid-ossp');
    schemaSql = schemaSql.replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/g, '-- EXTENSION pgcrypto');
    await db.exec(schemaSql);

    // 4. Grant table privileges as PostgREST does, relying on RLS to enforce boundaries
    await db.exec(`
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
    `);
  }, 60000);

  beforeEach(() => {
    // Clear local storage maps for service unit tests
    localStore.sessions.clear();
    localStore.codeToSession.clear();
    localStore.requests.clear();
    localStore.pairedDevices.clear();
    localStore.listeners.clear();
    localStore.requestListeners.clear();
  });

  // ============================================================================
  // PART 1: ACTUAL POSTGRESQL DATABASE AUTHORIZATION TESTS (PUBLIC ANON ROLE)
  // Tested against real PostgreSQL schema using the public 'anon' role
  // ============================================================================

  it('[Database RLS] Anonymous user cannot retrieve host tokens or enumerate sessions', async () => {
    // Ensure we are in superuser context to set up session
    await db.exec('SET ROLE postgres;');

    const sessionId = '11111111-1111-1111-1111-111111111111';
    const hostToken = generateSecureToken(32);
    const hostTokenHash = await hashHostToken(hostToken);
    const pairCode = '123456';
    const salt = generateSalt(16);
    const pairCodeHash = await hashPairCode(pairCode, salt);

    await db.query(
      `SELECT public.rpc_create_session($1, $2, $3, $4, now() + interval '3 minutes', 'Confidential Deck', 20);`,
      [sessionId, hostTokenHash, pairCodeHash, salt]
    );

    // Switch to 'anon' role (identity used when accessing via Supabase public anon key)
    await db.exec('SET ROLE anon;');

    // Attempt direct SELECT on presentation_sessions
    const anonQuery = await db.query('SELECT * FROM public.presentation_sessions;');
    // Row Level Security MUST deny all rows to public anon
    expect(anonQuery.rows.length).toBe(0);

    // Attempt direct SELECT with specific ID
    const directQuery = await db.query('SELECT host_session_token_hash FROM public.presentation_sessions WHERE id = $1;', [sessionId]);
    expect(directQuery.rows.length).toBe(0);
  });

  it('[Database RLS] Anonymous user cannot retrieve device tokens from paired_devices or pairing_requests', async () => {
    await db.exec('SET ROLE postgres;');

    const sessionId = '22222222-2222-2222-2222-222222222222';
    const hostHash = await hashHostToken('secret-host');
    const pairCodeHash = await hashPairCode('222333', 'salt');
    await db.query(
      `SELECT public.rpc_create_session($1, $2, $3, 'salt', now() + interval '3 minutes', 'Confidential Deck', 10);`,
      [sessionId, hostHash, pairCodeHash]
    );

    const requestId = '33333333-3333-3333-3333-333333333333';
    const secretHash = await hashRequesterSecret('dev-secret-123');
    await db.query(
      `SELECT public.rpc_submit_pairing_request($1, $2, 'phone-1', 'Executive Phone', $3);`,
      [requestId, sessionId, secretHash]
    );

    const deviceTokenHash = await hashDeviceToken('device-secret-token');
    await db.query(
      `SELECT public.rpc_approve_pairing_request($1, $2, $3, $4, 'ephemeral-token');`,
      [requestId, sessionId, hostHash, deviceTokenHash]
    );

    // Switch to public anonymous user
    await db.exec('SET ROLE anon;');

    // Direct SELECT on paired_devices
    const devicesRes = await db.query('SELECT * FROM public.paired_devices;');
    expect(devicesRes.rows.length).toBe(0);

    // Direct SELECT on pairing_requests
    const requestsRes = await db.query('SELECT * FROM public.pairing_requests;');
    expect(requestsRes.rows.length).toBe(0);
  });

  it('[Database RLS] Unauthorized user cannot modify presentation sessions', async () => {
    await db.exec('SET ROLE postgres;');
    const sessionId = '44444444-4444-4444-4444-444444444444';
    const hostHash = await hashHostToken('genuine-host-token');
    await db.query(
      `SELECT public.rpc_create_session($1, $2, 'hash', 'salt', now() + interval '3 minutes', 'Original Title', 10);`,
      [sessionId, hostHash]
    );

    // Switch to anon identity
    await db.exec('SET ROLE anon;');

    // 1. Attempt direct UPDATE
    const updateRes = await db.query(
      `UPDATE public.presentation_sessions SET title = 'Defaced Presentation' WHERE id = $1;`,
      [sessionId]
    );
    expect(updateRes.affectedRows).toBe(0);

    // 2. Attempt RPC refresh with forged host token
    const forgedHostHash = await hashHostToken('attacker-fake-token');
    const newCodeHash = await hashPairCode('999999', 'salt');
    const rpcRes = await db.query(
      `SELECT public.rpc_refresh_pair_code($1, $2, $3, now() + interval '3 minutes') as success;`,
      [sessionId, forgedHostHash, newCodeHash]
    );
    expect(rpcRes.rows[0].success).toBe(false);

    // Verify in database that session title was completely untouched
    await db.exec('SET ROLE postgres;');
    const checkRes = await db.query('SELECT title FROM public.presentation_sessions WHERE id = $1;', [sessionId]);
    expect(checkRes.rows[0].title).toBe('Original Title');
  });

  it('[Database RPC] Unauthorized user cannot approve pairing requests', async () => {
    await db.exec('SET ROLE postgres;');
    const sessionId = '55555555-5555-5555-5555-555555555555';
    const hostHash = await hashHostToken('legit-host-secret');
    await db.query(
      `SELECT public.rpc_create_session($1, $2, 'code-hash', 'salt', now() + interval '3 minutes', 'Board Deck', 15);`,
      [sessionId, hostHash]
    );

    const reqId = '66666666-6666-6666-6666-666666666666';
    await db.query(
      `SELECT public.rpc_submit_pairing_request($1, $2, 'rogue-dev', 'Rogue Phone', 'req-secret-hash');`,
      [reqId, sessionId]
    );

    // Attacker attempts to approve pairing request using invalid host token hash
    await db.exec('SET ROLE anon;');
    const fakeHostHash = await hashHostToken('attacker-fake-key');
    const dummyDeviceHash = await hashDeviceToken('dummy-tok');

    let approvalError: Error | null = null;
    try {
      await db.query(
        `SELECT public.rpc_approve_pairing_request($1, $2, $3, $4, 'bad-ephemeral');`,
        [reqId, sessionId, fakeHostHash, dummyDeviceHash]
      );
    } catch (err: unknown) {
      approvalError = err as Error;
    }

    expect(approvalError).not.toBeNull();
    expect(approvalError?.message).toContain('Unauthorized: Invalid host session token');

    // Verify request is still pending
    await db.exec('SET ROLE postgres;');
    const reqStatus = await db.query('SELECT status FROM public.pairing_requests WHERE id = $1;', [reqId]);
    expect(reqStatus.rows[0].status).toBe('pending');
  });

  it('[Database RPC] Expired Pair Code cannot establish a session or resolve', async () => {
    await db.exec('SET ROLE postgres;');
    const sessionId = '77777777-7777-7777-7777-777777777777';
    const hostHash = await hashHostToken('host-token-7');
    const expiredCodeHash = await hashPairCode('888888', 'salt');

    // Create session that expired 5 seconds ago
    await db.query(
      `SELECT public.rpc_create_session($1, $2, $3, 'salt', now() - interval '5 seconds', 'Expired Deck', 10);`,
      [sessionId, hostHash, expiredCodeHash]
    );

    // Mobile device calls rpc_resolve_pair_code
    await db.exec('SET ROLE anon;');
    const resolveRes = await db.query(
      `SELECT * FROM public.rpc_resolve_pair_code('client-ip-1', $1);`,
      [expiredCodeHash]
    );
    // Expired code returns 0 rows
    expect(resolveRes.rows.length).toBe(0);

    // Submitting pairing request directly against expired session must fail
    let submitError: Error | null = null;
    try {
      await db.query(
        `SELECT public.rpc_submit_pairing_request('88888888-8888-8888-8888-888888888888', $1, 'dev-id', 'Device', 'secret-hash');`,
        [sessionId]
      );
    } catch (err: unknown) {
      submitError = err as Error;
    }

    expect(submitError).not.toBeNull();
    expect(submitError?.message).toContain('Session is not active or pair code has expired.');
  });

  it('[Database RPC] Revoked devices immediately lose access', async () => {
    await db.exec('SET ROLE postgres;');
    const sessionId = '99999999-9999-9999-9999-999999999999';
    const hostHash = await hashHostToken('host-999');
    await db.query(
      `SELECT public.rpc_create_session($1, $2, 'pair-hash', 'salt', now() + interval '3 minutes', 'Revocation Deck', 10);`,
      [sessionId, hostHash]
    );

    const reqId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await db.query(
      `SELECT public.rpc_submit_pairing_request($1, $2, 'tablet-1', 'Tablet Controller', 'req-secret-hash');`,
      [reqId, sessionId]
    );

    const deviceToken = 'super-secret-token-device';
    const deviceTokenHash = await hashDeviceToken(deviceToken);
    await db.query(
      `SELECT public.rpc_approve_pairing_request($1, $2, $3, $4, 'ephemeral-tok');`,
      [reqId, sessionId, hostHash, deviceTokenHash]
    );

    // 1. Verify token is initially active
    const verifyBefore = await db.query(
      `SELECT public.rpc_verify_device_token($1, $2) as active;`,
      [sessionId, deviceTokenHash]
    );
    expect(verifyBefore.rows[0].active).toBe(true);

    // 2. Host revokes device
    const revokeRes = await db.query(
      `SELECT public.rpc_revoke_device($1, $2, 'tablet-1') as revoked;`,
      [sessionId, hostHash]
    );
    expect(revokeRes.rows[0].revoked).toBe(true);

    // 3. Verify token is now immediately denied
    const verifyAfter = await db.query(
      `SELECT public.rpc_verify_device_token($1, $2) as active;`,
      [sessionId, deviceTokenHash]
    );
    expect(verifyAfter.rows[0].active).toBe(false);
  });

  it('[Database RPC] A device cannot access another presentation session', async () => {
    await db.exec('SET ROLE postgres;');
    const sessionA = 'aaaaaaaa-1111-1111-1111-111111111111';
    const sessionB = 'bbbbbbbb-2222-2222-2222-222222222222';
    const hostHashA = await hashHostToken('host-A');
    const hostHashB = await hashHostToken('host-B');

    await db.query(`SELECT public.rpc_create_session($1, $2, 'code-a', 'salt', now() + interval '3 minutes', 'Deck A', 10);`, [sessionA, hostHashA]);
    await db.query(`SELECT public.rpc_create_session($1, $2, 'code-b', 'salt', now() + interval '3 minutes', 'Deck B', 10);`, [sessionB, hostHashB]);

    // Approve device only in Session A
    const reqA = 'cccccccc-3333-3333-3333-333333333333';
    await db.query(`SELECT public.rpc_submit_pairing_request($1, $2, 'dev-A', 'Device A', 'secret');`, [reqA, sessionA]);

    const deviceTokenHashA = await hashDeviceToken('token-belongs-to-A');
    await db.query(`SELECT public.rpc_approve_pairing_request($1, $2, $3, $4, 'ephemeral');`, [reqA, sessionA, hostHashA, deviceTokenHashA]);

    // Attempt to verify Device A's token against Session B
    const crossVerify = await db.query(
      `SELECT public.rpc_verify_device_token($1, $2) as active;`,
      [sessionB, deviceTokenHashA]
    );
    expect(crossVerify.rows[0].active).toBe(false);
  });

  it('[Database RPC] Valid approved devices can authenticate commands', async () => {
    await db.exec('SET ROLE postgres;');
    const sessionId = 'dddddddd-4444-4444-4444-444444444444';
    const hostHash = await hashHostToken('host-valid');
    await db.query(`SELECT public.rpc_create_session($1, $2, 'code-v', 'salt', now() + interval '3 minutes', 'Valid Deck', 10);`, [sessionId, hostHash]);

    const reqId = 'eeeeeeee-5555-5555-5555-555555555555';
    await db.query(`SELECT public.rpc_submit_pairing_request($1, $2, 'legit-dev', 'Legit Device', 'secret');`, [reqId, sessionId]);

    const deviceTokenHash = await hashDeviceToken('authentic-device-token');
    await db.query(`SELECT public.rpc_approve_pairing_request($1, $2, $3, $4, 'ephemeral');`, [reqId, sessionId, hostHash, deviceTokenHash]);

    // Query rpc_verify_device_token
    await db.exec('SET ROLE anon;');
    const verifyRes = await db.query(
      `SELECT public.rpc_verify_device_token($1, $2) as active;`,
      [sessionId, deviceTokenHash]
    );
    expect(verifyRes.rows[0].active).toBe(true);
  });

  it('[Database RPC] Locks out brute-force pair code enumeration attempts after 5 failures', async () => {
    await db.exec('SET ROLE anon;');
    const attackerIdentifier = 'attacker-ip-192.168.1.100';

    // 1 to 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const res = await db.query(
        `SELECT * FROM public.rpc_resolve_pair_code($1, 'invalid_code_hash');`,
        [attackerIdentifier]
      );
      expect(res.rows.length).toBe(0);
    }

    // 5th failed attempt
    const fifthRes = await db.query(
      `SELECT * FROM public.rpc_resolve_pair_code($1, 'invalid_code_hash');`,
      [attackerIdentifier]
    );
    expect(fifthRes.rows.length).toBe(0);

    // 6th attempt: database check_rate_limit MUST throw rate limit exception
    let rateLimitError: Error | null = null;
    try {
      await db.query(
        `SELECT * FROM public.rpc_resolve_pair_code($1, 'any_code_hash');`,
        [attackerIdentifier]
      );
    } catch (err: unknown) {
      rateLimitError = err as Error;
    }

    expect(rateLimitError).not.toBeNull();
    expect(rateLimitError?.message).toContain('Rate limit exceeded. Too many failed attempts. Please wait.');
  });

  // ============================================================================
  // PART 2: APPLICATION SERVICE INTEGRATION & REALTIME COMMAND GATE TESTS
  // ============================================================================

  it('[Service & Realtime] Prevents commands from revoked devices on realtime bus', async () => {
    const session = await pairingService.createSession('Demo.pdf', 10);
    const reqRes = await pairingService.submitPairingRequest(session.pairCode, 'dev-test', 'Tester Phone');
    const approved = await pairingService.approveRequest(reqRes.requestId!);

    expect(approved?.isActive).toBe(true);
    expect(pairingService.verifyDeviceToken(session.id, approved?.deviceToken)).toBe(true);

    const receivedCommands: ProtocolMessage[] = [];
    const unsubscribe = pairingService.subscribeToCommands(session.id, (msg) => {
      receivedCommands.push(msg);
    });

    // 1. Send valid command while active
    pairingService.broadcastCommand(session.id, {
      id: 'cmd-1',
      type: 'NEXT_SLIDE',
      sessionId: session.id,
      deviceToken: approved?.deviceToken,
      timestamp: Date.now(),
      payload: {},
    });

    expect(receivedCommands.length).toBe(1);

    // 2. Host revokes device
    await pairingService.revokeDevice(session.id, 'dev-test');
    expect(pairingService.verifyDeviceToken(session.id, approved?.deviceToken)).toBe(false);

    // 3. Revoked device attempts to send command
    pairingService.broadcastCommand(session.id, {
      id: 'cmd-2',
      type: 'NEXT_SLIDE',
      sessionId: session.id,
      deviceToken: approved?.deviceToken,
      timestamp: Date.now(),
      payload: {},
    });

    // Revoked command dropped
    const slideCommands = receivedCommands.filter((c) => c.type === 'NEXT_SLIDE');
    expect(slideCommands.length).toBe(1);

    unsubscribe();
  });

  it('[Service & Realtime] Isolates commands across distinct sessions', async () => {
    const sessionA = await pairingService.createSession('Session A.pdf', 10);
    const sessionB = await pairingService.createSession('Session B.pdf', 10);

    const reqA = await pairingService.submitPairingRequest(sessionA.pairCode, 'dev-A', 'Device A');
    const approvedA = await pairingService.approveRequest(reqA.requestId!);

    const receivedB: ProtocolMessage[] = [];
    const unsubB = pairingService.subscribeToCommands(sessionB.id, (msg) => {
      receivedB.push(msg);
    });

    // Device A attempts to command Session B
    pairingService.broadcastCommand(sessionB.id, {
      id: 'cross-attack',
      type: 'NEXT_SLIDE',
      sessionId: sessionB.id,
      deviceToken: approvedA?.deviceToken,
      timestamp: Date.now(),
      payload: {},
    });

    expect(receivedB.length).toBe(0);
    unsubB();
  });
});
