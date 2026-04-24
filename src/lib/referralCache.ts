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

export function getCached(userId: string): CachedNetwork | null {
  // 1. Memory first (fastest)
  const mem = memoryCache.get(userId);
  if (mem && isFresh(mem)) return mem;

  // 2. Hydrate from sessionStorage if available
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedNetwork;
    if (!parsed || typeof parsed.cachedAt !== "number") return null;
    if (!isFresh(parsed)) {
      window.sessionStorage.removeItem(storageKey(userId));
      return null;
    }
    // Promote to memory
    memoryCache.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function setCached(userId: string, value: Omit<CachedNetwork, "cachedAt">): void {
  const entry: CachedNetwork = { ...value, cachedAt: Date.now() };
  memoryCache.set(userId, entry);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(userId), JSON.stringify(entry));
  } catch {
    // Quota or serialization issues — memory cache still works
  }
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
