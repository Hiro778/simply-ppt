import * as SecureStore from 'expo-secure-store';
import { generateRandomHex } from './crypto';

const KEYS = {
  DEVICE_TOKEN: 'simply_ppt_secure_device_token',
  SESSION_ID: 'simply_ppt_session_id',
  REQUEST_ID: 'simply_ppt_request_id',
  REQUESTER_SECRET: 'simply_ppt_requester_secret',
  DEVICE_ID: 'simply_ppt_device_id',
  DEVICE_NAME: 'simply_ppt_device_name',
  LAST_CODE: 'simply_ppt_last_code',
  CUSTOM_SUPABASE_URL: 'simply_ppt_custom_supabase_url',
  CUSTOM_SUPABASE_KEY: 'simply_ppt_custom_supabase_key',
} as const;

// In-memory fallback if native SecureStore is unavailable in mock tests/Node
const memoryStore = new Map<string, string>();

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch {
    memoryStore.set(key, value);
  }
}

async function safeGet(key: string): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(key);
    if (val !== null) return val;
  } catch {
    // fallback to memory
  }
  return memoryStore.get(key) || null;
}

async function safeDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
  memoryStore.delete(key);
}

export const secureStorage = {
  // Device Token (Authorized session token issued by desktop host)
  async saveDeviceToken(token: string): Promise<void> {
    await safeSet(KEYS.DEVICE_TOKEN, token);
  },
  async getDeviceToken(): Promise<string | null> {
    return safeGet(KEYS.DEVICE_TOKEN);
  },

  // Presentation Session UUID
  async saveSessionId(sessionId: string): Promise<void> {
    await safeSet(KEYS.SESSION_ID, sessionId);
  },
  async getSessionId(): Promise<string | null> {
    return safeGet(KEYS.SESSION_ID);
  },

  // Active Pairing Request ID
  async saveRequestId(requestId: string): Promise<void> {
    await safeSet(KEYS.REQUEST_ID, requestId);
  },
  async getRequestId(): Promise<string | null> {
    return safeGet(KEYS.REQUEST_ID);
  },

  // Requester Secret (Used to authenticate polling for host approval)
  async saveRequesterSecret(secret: string): Promise<void> {
    await safeSet(KEYS.REQUESTER_SECRET, secret);
  },
  async getRequesterSecret(): Promise<string | null> {
    return safeGet(KEYS.REQUESTER_SECRET);
  },

  // Persistent Device Identifier
  async getOrCreateDeviceId(): Promise<string> {
    let id = await safeGet(KEYS.DEVICE_ID);
    if (!id) {
      id = `android_${Date.now()}_${generateRandomHex(4)}`;
      await safeSet(KEYS.DEVICE_ID, id);
    }
    return id;
  },

  // Device Display Name
  async getDeviceName(): Promise<string> {
    const name = await safeGet(KEYS.DEVICE_NAME);
    return name || 'Android Controller';
  },
  async saveDeviceName(name: string): Promise<void> {
    await safeSet(KEYS.DEVICE_NAME, name);
  },

  // Custom Supabase endpoint override (for private enterprise/local servers)
  async getCustomSupabaseConfig(): Promise<{ url: string | null; key: string | null }> {
    const url = await safeGet(KEYS.CUSTOM_SUPABASE_URL);
    const key = await safeGet(KEYS.CUSTOM_SUPABASE_KEY);
    return { url, key };
  },
  async saveCustomSupabaseConfig(url: string, key: string): Promise<void> {
    await safeSet(KEYS.CUSTOM_SUPABASE_URL, url);
    await safeSet(KEYS.CUSTOM_SUPABASE_KEY, key);
  },

  // Complete cleanup on disconnect, revocation, or logout
  async clearSession(): Promise<void> {
    await safeDelete(KEYS.DEVICE_TOKEN);
    await safeDelete(KEYS.SESSION_ID);
    await safeDelete(KEYS.REQUEST_ID);
    await safeDelete(KEYS.REQUESTER_SECRET);
  },

  async clearAll(): Promise<void> {
    await this.clearSession();
    await safeDelete(KEYS.DEVICE_ID);
    await safeDelete(KEYS.DEVICE_NAME);
    await safeDelete(KEYS.CUSTOM_SUPABASE_URL);
    await safeDelete(KEYS.CUSTOM_SUPABASE_KEY);
  },
};
