/**
 * In-memory + sessionStorage cache for referral network computations.
 * Keyed by user_id so multiple accounts in the same browser don't collide.
 *
 * - TTL: 5 minutes (configurable)
 * - Survives client-side navigation (in-memory) and page refresh (sessionStorage)
 * - Cleared on logout, on explicit invalidate(), or on realtime referral_tree changes
 */

export interface CachedReferralEntry {
  user_id: string;
  full_name: string | null;
  tier: number;
  phone: string | null;
  email: string | null;
}

export interface CachedNetwork {
  referrals: CachedReferralEntry[];
  tierCounts: Record<number, number>;
  beyondTier5Count: number;
  cachedAt: number; // epoch ms
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_PREFIX = "nocap.referral.network.v1.";

const memoryCache = new Map<string, CachedNetwork>();

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function isFresh(entry: CachedNetwork): boolean {
  return Date.now() - entry.cachedAt < TTL_MS;
}

/**
 * Read from durable storage (localStorage) first so the cache survives full
 * page reloads AND tab close/reopen. Falls back to sessionStorage for legacy
 * entries written by previous versions of this module.
 */
function readPersisted(userId: string): CachedNetwork | null {
  if (typeof window === "undefined") return null;
  const key = storageKey(userId);
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = store.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as CachedNetwork;
      if (!parsed || typeof parsed.cachedAt !== "number") continue;
      if (!isFresh(parsed)) {
        store.removeItem(key);
        continue;
      }
      return parsed;
    } catch {
      // ignore individual store failures
    }
  }
  return null;
}

function writePersisted(userId: string, entry: CachedNetwork): void {
  if (typeof window === "undefined") return;
  const key = storageKey(userId);
  const payload = JSON.stringify(entry);
  try {
    window.localStorage.setItem(key, payload);
  } catch {
    // localStorage quota or privacy mode — fall back to sessionStorage
    try {
      window.sessionStorage.setItem(key, payload);
    } catch {
      // memory-only is fine
    }
  }
}

function removePersisted(userId: string): void {
  if (typeof window === "undefined") return;
  const key = storageKey(userId);
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  try { window.sessionStorage.removeItem(key); } catch { /* ignore */ }
}

export function getCached(userId: string): CachedNetwork | null {
  // 1. Memory first (fastest)
  const mem = memoryCache.get(userId);
  if (mem && isFresh(mem)) return mem;

  // 2. Hydrate from durable storage (localStorage, then sessionStorage fallback)
  const persisted = readPersisted(userId);
  if (persisted) {
    memoryCache.set(userId, persisted);
    return persisted;
  }
  return null;
}

export function setCached(userId: string, value: Omit<CachedNetwork, "cachedAt">): void {
  const entry: CachedNetwork = { ...value, cachedAt: Date.now() };
  memoryCache.set(userId, entry);
  writePersisted(userId, entry);
}

export function invalidate(userId: string): void {
  memoryCache.delete(userId);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Invalidate the cache after a member action that may impact the referral downline
 * (QR pay, P2P transfer, marketplace checkout, refund, etc.). These actions don't
 * change tier membership but they DO ripple cashback/commission across the upline,
 * making cached earnings/totals stale on next visit to /referral.
 *
 * Safe to call from anywhere — no-op when userId is missing or storage is unavailable.
 */
export function invalidateOnDownlineImpact(userId: string | null | undefined): void {
  if (!userId) return;
  invalidate(userId);
}

/**
 * Broadcast a cache-invalidation signal to a specific member's open sessions.
 * Used by admins to force-clear another user's referral network cache when
 * investigating incorrect tier counts. The target browser listens on the same
 * channel (see Referral.tsx) and clears its local cache + refetches.
 *
 * Returns true on successful send, false otherwise. Best-effort: the target
 * may not be online, in which case the next visit (within TTL) will still
 * read stale data — but the admin can also rely on the natural 5-min TTL.
 */
export async function broadcastInvalidate(
  userId: string,
  client: { channel: (name: string) => any; removeChannel: (ch: any) => void },
): Promise<boolean> {
  if (!userId) return false;
  try {
    const ch = client.channel(`referral-sync-${userId}`);
    await new Promise<void>((resolve) => {
      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED") resolve();
      });
      // Safety timeout
      setTimeout(() => resolve(), 2000);
    });
    await ch.send({
      type: "broadcast",
      event: "invalidate",
      payload: { at: Date.now() },
    });
    setTimeout(() => client.removeChannel(ch), 500);
    return true;
  } catch {
    return false;
  }
}

export function clearAll(): void {
  memoryCache.clear();
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export const REFERRAL_CACHE_TTL_MS = TTL_MS;
