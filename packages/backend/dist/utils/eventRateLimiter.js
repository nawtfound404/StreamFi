"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventLimiter = void 0;
exports.allowEvent = allowEvent;
class SlidingWindowLimiter {
    store = new Map();
    maxEntries;
    constructor(maxEntries = 10000) {
        this.maxEntries = maxEntries;
    }
    allow(key, limit, windowMs, now = Date.now()) {
        let arr = this.store.get(key);
        if (!arr) {
            arr = [];
            this.store.set(key, arr);
        }
        // purge old
        while (arr.length && now - arr[0] > windowMs)
            arr.shift();
        if (arr.length >= limit)
            return false;
        arr.push(now);
        // GC if map too large
        if (this.store.size > this.maxEntries) {
            // simple random delete
            const iter = this.store.keys();
            const first = iter.next().value;
            if (first)
                this.store.delete(first);
        }
        return true;
    }
}
exports.eventLimiter = new SlidingWindowLimiter();
function allowEvent(userId, event, opts) {
    const key = `${userId}:${event}`;
    return exports.eventLimiter.allow(key, opts.limit, opts.windowMs);
}
//# sourceMappingURL=eventRateLimiter.js.map