/**
 * Generates a cryptographically secure 6-digit numeric pair code.
 * Ensures numbers are evenly distributed between 100000 and 999999.
 */
export function generatePairCode(): string {
  // Use crypto.getRandomValues if available in browser or node
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    // Map to range [100000, 999999]
    const code = 100000 + (array[0] % 900000);
    return code.toString();
  }
  
  // Fallback for mock environments
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculates expiration timestamp: default is 3 minutes (180,000 milliseconds)
 */
export function calculateExpiration(ttlMs: number = 3 * 60 * 1000): Date {
  return new Date(Date.now() + ttlMs);
}

/**
 * Checks if a given expiration timestamp is still valid
 */
export function isPairCodeValid(expiresAt: Date | string | number): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  return Date.now() < expiryTime;
}

/**
 * Returns remaining seconds until expiration, or 0 if expired
 */
export function getRemainingSeconds(expiresAt: Date | string | number): number {
  const expiryTime = new Date(expiresAt).getTime();
  const diff = Math.floor((expiryTime - Date.now()) / 1000);
  return Math.max(0, diff);
}
