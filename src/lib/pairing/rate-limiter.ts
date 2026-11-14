interface RateLimitRecord {
  attempts: number;
  lastAttemptTime: number;
  blockedUntil?: number;
}

const MAX_RATE_LIMIT_RECORDS = 5000;

export class PairingRateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(
    maxAttempts: number = 5,
    windowMs: number = 60 * 1000, // 1 minute
    blockDurationMs: number = 5 * 60 * 1000 // 5 minutes block
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;
  }

  /**
   * Periodically prunes expired records to prevent unbounded memory growth
   */
  private prune(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      const isBlockExpired = !record.blockedUntil || record.blockedUntil <= now;
      const isWindowExpired = now - record.lastAttemptTime > this.windowMs;
      if (isBlockExpired && isWindowExpired) {
        this.records.delete(key);
      }
    }

    // If still over capacity after pruning, drop the oldest entry
    if (this.records.size > MAX_RATE_LIMIT_RECORDS) {
      const oldestKey = this.records.keys().next().value;
      if (oldestKey) {
        this.records.delete(oldestKey);
      }
    }
  }

  /**
   * Checks if an identifier is allowed to attempt pairing
   */
  public canAttempt(identifier: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
    const now = Date.now();
    const record = this.records.get(identifier);

    if (!record) {
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    // Check if blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
    }

    // Reset window if past window duration
    if (now - record.lastAttemptTime > this.windowMs) {
      this.records.delete(identifier);
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    const remaining = Math.max(0, this.maxAttempts - record.attempts);
    return {
      allowed: record.attempts < this.maxAttempts,
      remainingAttempts: remaining,
    };
  }

  /**
   * Registers a failed attempt for an identifier
   */
  public recordFailedAttempt(identifier: string): { blocked: boolean; retryAfterSeconds?: number } {
    const now = Date.now();

    // Trigger cleanup if map size approaches threshold
    if (this.records.size >= MAX_RATE_LIMIT_RECORDS) {
      this.prune();
    }

    let record = this.records.get(identifier);

    if (!record || now - record.lastAttemptTime > this.windowMs) {
      record = { attempts: 1, lastAttemptTime: now };
    } else {
      record.attempts += 1;
      record.lastAttemptTime = now;
    }

    if (record.attempts >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      this.records.set(identifier, record);
      return { blocked: true, retryAfterSeconds: Math.ceil(this.blockDurationMs / 1000) };
    }

    this.records.set(identifier, record);
    return { blocked: false };
  }

  /**
   * Resets rate-limiting upon successful pairing
   */
  public reset(identifier: string): void {
    this.records.delete(identifier);
  }
}

// Global default singleton
export const defaultPairingRateLimiter = new PairingRateLimiter();
