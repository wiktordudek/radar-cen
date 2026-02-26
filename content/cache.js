"use strict";

const LFUCache = (() => {
  // Sharding
  const STORAGE_PREFIX = "radarCen_shard_";
  const SHARD_CHARS = "0123456789abcdef";
  function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
  function shardKey(pid) {
    return SHARD_CHARS[djb2(pid) % SHARD_CHARS.length];
  }

  function storageKey(shard) {
    return STORAGE_PREFIX + shard;
  }

  // Persistence per shard
  const shards = {};
  function loadShard(shard) {
    if (shards[shard]) return shards[shard];
    try {
      const raw = localStorage.getItem(storageKey(shard));
      shards[shard] = raw ? JSON.parse(raw) : {};
    } catch (_) {
      shards[shard] = {};
    }
    return shards[shard];
  }
  function persistShard(shard) {
    try {
      localStorage.setItem(storageKey(shard), JSON.stringify(shards[shard]));
    } catch (_) {}
  }

  // LFU Eviction, within the same shard only
  function evictLFU(shard) {
    const store = shards[shard];
    let victimKey = null;
    let lowestHits = Infinity;
    for (const [key, entry] of Object.entries(store)) {
      if (entry.hitCount < lowestHits) {
        lowestHits = entry.hitCount;
        victimKey = key;
      }
    }
    if (victimKey !== null) delete store[victimKey];
  }

  // Public API
  return {
    get(pid, cacheTTL) {
      const shard = shardKey(pid);
      const store = loadShard(shard);
      const entry = store[pid];
      if (!entry) return null;

      if (Date.now() - entry.timestamp > cacheTTL * 3_600_000) {
        delete store[pid];
        persistShard(shard);
        return null;
      }

      entry.hitCount++;
      persistShard(shard);
      return entry.price;
    },

    set(pid, price, cacheMaxSize) {
      const shard = shardKey(pid);
      const store = loadShard(shard);
      const shardMaxSize = Math.ceil(cacheMaxSize / SHARD_CHARS.length);

      if (!store[pid] && Object.keys(store).length >= shardMaxSize)
        evictLFU(shard);
      store[pid] = { price, timestamp: Date.now(), hitCount: 1 };
      persistShard(shard);
    },
  };
})();
