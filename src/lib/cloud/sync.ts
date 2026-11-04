import { getDemoProducts } from '@/lib/demo/service';
import { CartItem } from '@/types';
import type { User, SavedAddress, CustomerOrder } from '@/context/AuthContext';

const CLOUD_KV_APP_KEY = 'rshh5l53';
const CLOUD_KV_BASE = `https://keyvalue.immanuel.co/api/KeyVal`;
const CHUNK_SIZE = 900; // Safe URL path segment length for Base64Url chunks

function toBase64Url(str: string): string {
  if (typeof window !== 'undefined') {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(b64Url: string): string {
  const b64 = b64Url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const full = b64 + pad;
  if (typeof window !== 'undefined') {
    const binary = atob(full);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(full, 'base64').toString('utf-8');
}

export function hashKey(input: string): string {
  const clean = input.trim().toLowerCase();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  for (let i = 0, ch; i < clean.length; i++) {
    ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

async function cloudSetRaw(key: string, value: string): Promise<boolean> {
  try {
    const safeVal = value || 'EMPTY';
    const res = await fetch(
      `${CLOUD_KV_BASE}/UpdateValue/${CLOUD_KV_APP_KEY}/${encodeURIComponent(key)}/${encodeURIComponent(safeVal)}`,
      { method: 'POST' }
    );
    return res.ok;
  } catch (e) {
    console.warn('Cloud KV write error:', e);
    return false;
  }
}

async function cloudGetRaw(key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${CLOUD_KV_BASE}/GetValue/${CLOUD_KV_APP_KEY}/${encodeURIComponent(key)}`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!res.ok) return null;
    const text = await res.text();
    const cleaned = text.replace(/^"|"$/g, '').trim();
    if (!cleaned || cleaned === 'null' || cleaned === 'EMPTY') return null;
    return cleaned;
  } catch (e) {
    console.warn('Cloud KV read error:', e);
    return null;
  }
}

export async function cloudSetJson(key: string, data: unknown): Promise<boolean> {
  try {
    const json = JSON.stringify(data);
    const encoded = toBase64Url(json);

    if (encoded.length <= CHUNK_SIZE) {
      return await cloudSetRaw(key, encoded);
    }

    // Multi-chunk storage for larger payloads
    const totalChunks = Math.ceil(encoded.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const part = encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const ok = await cloudSetRaw(`${key}_c${i}`, part);
      if (!ok) return false;
    }
    return await cloudSetRaw(key, `CHUNKED:${totalChunks}`);
  } catch (e) {
    console.warn('cloudSetJson failed:', e);
    return false;
  }
}

export async function cloudGetJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await cloudGetRaw(key);
    if (!raw) return null;

    if (raw.startsWith('CHUNKED:')) {
      const count = parseInt(raw.split(':')[1], 10);
      if (isNaN(count) || count <= 0 || count > 20) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await cloudGetRaw(`${key}_c${i}`);
        if (!part) return null;
        parts.push(part);
      }
      const decoded = fromBase64Url(parts.join(''));
      return JSON.parse(decoded) as T;
    }

    const decoded = fromBase64Url(raw);
    return JSON.parse(decoded) as T;
  } catch (e) {
    console.warn('cloudGetJson failed:', e);
    return null;
  }
}

// ============================================================================
// 1. CLOUD ACCOUNT CREDENTIALS & PROFILE SYNC (Computer <-> Mobile)
// ============================================================================
export type CloudAccountRecord = User & {
  passwordHash: string;
};

function getAccountCloudKey(email: string): string {
  return `sa_acc_${hashKey(email.trim().toLowerCase())}`;
}

export async function saveAccountToCloud(account: CloudAccountRecord): Promise<boolean> {
  const key = getAccountCloudKey(account.email);
  return await cloudSetJson(key, account);
}

export async function fetchAccountFromCloud(email: string): Promise<CloudAccountRecord | null> {
  const key = getAccountCloudKey(email);
  return await cloudGetJson<CloudAccountRecord>(key);
}

// ============================================================================
// 2. CLOUD PER-USER CART SYNC (Compact representation so it's ultra-fast)
// ============================================================================
type CompactCartItem = {
  id: string;
  s: string; // product slug
  q: number; // quantity
  p: number; // unit price
  v?: string; // variant_name
};

function getCartCloudKey(userId: string): string {
  return `sa_cart_${hashKey(userId)}`;
}

export async function saveUserCartToCloud(userId: string, items: CartItem[]): Promise<boolean> {
  const compact: CompactCartItem[] = items.map((i) => ({
    id: i.product.id,
    s: i.product.slug,
    q: i.quantity,
    p: i.price,
    v: i.variant_name,
  }));
  return await cloudSetJson(getCartCloudKey(userId), compact);
}

export async function fetchUserCartFromCloud(userId: string): Promise<CartItem[] | null> {
  const compact = await cloudGetJson<CompactCartItem[]>(getCartCloudKey(userId));
  if (!compact || !Array.isArray(compact)) return null;

  const catalog = getDemoProducts();
  const hydrated: CartItem[] = [];
  for (const c of compact) {
    const product =
      catalog.find((p) => p.id === c.id || p.slug === c.s) || catalog[0];
    if (product) {
      hydrated.push({
        product,
        quantity: c.q || 1,
        price: c.p ?? (product.promo_price ?? product.price),
        variant_name: c.v,
      });
    }
  }
  return hydrated;
}

// ============================================================================
// 3. CLOUD PER-USER ADDRESSES & ORDERS SYNC
// ============================================================================
function getAddressesCloudKey(userId: string): string {
  return `sa_addr_${hashKey(userId)}`;
}

function getOrdersCloudKey(userId: string): string {
  return `sa_ord_${hashKey(userId)}`;
}

export async function saveUserAddressesToCloud(
  userId: string,
  addresses: SavedAddress[]
): Promise<boolean> {
  return await cloudSetJson(getAddressesCloudKey(userId), addresses.slice(0, 10));
}

export async function fetchUserAddressesFromCloud(
  userId: string
): Promise<SavedAddress[] | null> {
  return await cloudGetJson<SavedAddress[]>(getAddressesCloudKey(userId));
}

export async function saveUserOrdersToCloud(
  userId: string,
  orders: CustomerOrder[]
): Promise<boolean> {
  return await cloudSetJson(getOrdersCloudKey(userId), orders.slice(0, 15));
}

export async function fetchUserOrdersFromCloud(
  userId: string
): Promise<CustomerOrder[] | null> {
  return await cloudGetJson<CustomerOrder[]>(getOrdersCloudKey(userId));
}
