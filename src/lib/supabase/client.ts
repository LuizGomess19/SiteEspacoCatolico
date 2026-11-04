import { createClient, SupabaseClient } from '@supabase/supabase-js';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const STORAGE_CONFIG_KEY = 'santo_antonio_supabase_config';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseCredentials(): { url: string; anonKey: string; source: 'env' | 'local' | 'none' } {
  if (envUrl && envAnonKey && !envUrl.includes('placeholder') && !envUrl.includes('seu-projeto')) {
    return { url: envUrl, anonKey: envAnonKey, source: 'env' };
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.url && parsed?.anonKey && parsed.url.startsWith('https://')) {
          return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim(), source: 'local' };
        }
      }
    } catch (e) {
      // Ignore storage read errors
    }
  }

  return { url: '', anonKey: '', source: 'none' };
}

export function isSupabaseActive(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  const key = `${url}::${anonKey}`;
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  cachedConfigKey = key;
  return cachedClient;
}

export function saveSupabaseRuntimeConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    STORAGE_CONFIG_KEY,
    JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
  );
  cachedClient = null;
  cachedConfigKey = '';
}

export function clearSupabaseRuntimeConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_CONFIG_KEY);
  cachedClient = null;
  cachedConfigKey = '';
}

export const isSupabaseConfigured = Boolean(
  envUrl && envAnonKey && !envUrl.includes('placeholder') && !envUrl.includes('seu-projeto')
);

export const supabase = isSupabaseConfigured ? createClient(envUrl, envAnonKey) : null;
