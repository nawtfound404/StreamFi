type Key = string;

class SlidingWindowLimiter {
  private store = new Map<Key, number[]>();
  private maxEntries: number;

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
  }

  allow(key: Key, limit: number, windowMs: number, now = Date.now()): boolean {
    let arr = this.store.get(key);
    if (!arr) { arr = []; this.store.set(key, arr); }
    // purge old
    while (arr.length && now - arr[0] > windowMs) arr.shift();
    if (arr.length >= limit) return false;
    arr.push(now);
    // GC if map too large
    if (this.store.size > this.maxEntries) {
      // simple random delete
      const iter = this.store.keys();
      const first = iter.next().value as Key | undefined;
      if (first) this.store.delete(first);
    }
    return true;
  }
}

export const eventLimiter = new SlidingWindowLimiter();

export function allowEvent(userId: string, event: string, opts: { limit: number; windowMs: number }): boolean {
  const key = `${userId}:${event}`;
  return eventLimiter.allow(key, opts.limit, opts.windowMs);
}
