import { describe, it, expect } from 'vitest';
import { PairingRateLimiter } from '@/lib/pairing/rate-limiter';

describe('Pairing Rate Limiter (Unit)', () => {
  it('allows attempts below the maximum threshold', () => {
    const limiter = new PairingRateLimiter(3, 1000, 5000);
    const id = 'device-abc';

    expect(limiter.canAttempt(id).allowed).toBe(true);
    limiter.recordFailedAttempt(id);
    expect(limiter.canAttempt(id).allowed).toBe(true);
    limiter.recordFailedAttempt(id);
    expect(limiter.canAttempt(id).allowed).toBe(true);
  });

  it('blocks attempts after exceeding maximum failures', () => {
    const limiter = new PairingRateLimiter(3, 60000, 300000);
    const id = 'device-bad';

    limiter.recordFailedAttempt(id);
    limiter.recordFailedAttempt(id);
    const blockedRes = limiter.recordFailedAttempt(id);

    expect(blockedRes.blocked).toBe(true);
    expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);

    const check = limiter.canAttempt(id);
    expect(check.allowed).toBe(false);
    expect(check.remainingAttempts).toBe(0);
    expect(check.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets rate limits upon successful pairing', () => {
    const limiter = new PairingRateLimiter(3, 60000, 300000);
    const id = 'device-reset';

    limiter.recordFailedAttempt(id);
    limiter.recordFailedAttempt(id);
    expect(limiter.canAttempt(id).remainingAttempts).toBe(1);

    limiter.reset(id);
    expect(limiter.canAttempt(id).remainingAttempts).toBe(3);
    expect(limiter.canAttempt(id).allowed).toBe(true);
  });
});
