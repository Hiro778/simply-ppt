/**
 * Cryptographic hashing and token generation utilities using native Web Crypto API.
 * Ensures zero external cryptographic dependencies.
 */

export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSecureToken(bytes: number = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const DEFAULT_PAIR_CODE_SALT = 'simply_ppt_pairing_salt_v1';

export function generateSalt(bytes: number = 16): string {
  return generateSecureToken(bytes);
}

export async function hashPairCode(pairCode: string, salt: string = DEFAULT_PAIR_CODE_SALT): Promise<string> {
  return sha256(`simply_ppt_code:${salt}:${pairCode}`);
}

export async function hashHostToken(hostToken: string): Promise<string> {
  return sha256(`simply_ppt_host:${hostToken}`);
}

export async function hashDeviceToken(deviceToken: string): Promise<string> {
  return sha256(`simply_ppt_device:${deviceToken}`);
}

export async function hashRequesterSecret(secret: string): Promise<string> {
  return sha256(`simply_ppt_req:${secret}`);
}
