import { describe, it, expect } from 'vitest';
import {
  generatePairCode,
  calculateExpiration,
  isPairCodeValid,
  getRemainingSeconds,
} from '@/lib/pairing/code-generator';

describe('Pairing Code Generator (Unit)', () => {
  it('generates a 6-digit numeric string', () => {
    for (let i = 0; i < 50; i++) {
      const code = generatePairCode();
      expect(code).toMatch(/^\d{6}$/);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('calculates 3-minute expiration timestamp', () => {
    const now = Date.now();
    const expiresAt = calculateExpiration(3 * 60 * 1000);
    const diff = expiresAt.getTime() - now;
    // Allow slight execution delay variance (179,000 to 181,000 ms)
    expect(diff).toBeGreaterThanOrEqual(179000);
    expect(diff).toBeLessThanOrEqual(181000);
  });

  it('validates active non-expired codes and rejects expired codes', () => {
    const futureDate = new Date(Date.now() + 60000);
    const pastDate = new Date(Date.now() - 5000);

    expect(isPairCodeValid(futureDate)).toBe(true);
    expect(isPairCodeValid(futureDate.toISOString())).toBe(true);

    expect(isPairCodeValid(pastDate)).toBe(false);
    expect(isPairCodeValid(pastDate.toISOString())).toBe(false);
  });

  it('computes remaining seconds correctly', () => {
    const expiresAt = new Date(Date.now() + 30000);
    const remaining = getRemainingSeconds(expiresAt);
    expect(remaining).toBeGreaterThanOrEqual(28);
    expect(remaining).toBeLessThanOrEqual(30);

    const expired = new Date(Date.now() - 10000);
    expect(getRemainingSeconds(expired)).toBe(0);
  });
});
