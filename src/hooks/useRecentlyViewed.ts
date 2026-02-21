import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "nocap_recently_viewed";
const MAX_ITEMS = 10;

let listeners: (() => void)[] = [];
function emitChange() {
  listeners.forEach((l) => l());
}

function getSnapshot(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function addRecentlyViewed(productId: string) {
  const current = getSnapshot();
  const filtered = current.filter((id) => id !== productId);
  const updated = [productId, ...filtered].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  emitChange();
}

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
