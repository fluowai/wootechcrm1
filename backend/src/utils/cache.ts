import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DEFAULT_TTL_MS = Number(process.env.CACHE_TTL_MS || 60000);
export const MAX_MEMORY_CACHE_ITEMS = Number(process.env.MAX_CACHE_ITEMS || 5000);

type CacheEntry<T> = { value: T; expiresAt: number };

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    if (this.store.size > MAX_MEMORY_CACHE_ITEMS) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    if (this.store.size >= MAX_MEMORY_CACHE_ITEMS) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  get stats() {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      ratio: this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses)).toFixed(3)
        : "0.000",
      backend: "memory",
    };
  }
}

class RedisCache {
  private client: Redis;
  private connected = false;
  private memoryFallback: MemoryCache;

  constructor() {
    this.memoryFallback = new MemoryCache();
    this.client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    this.client.on("connect", () => { this.connected = true; });
    this.client.on("close", () => { this.connected = false; });
    this.client.on("error", () => { this.connected = false; });
    this.client.connect().catch(() => { this.connected = false; });
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.connected) return this.memoryFallback.get<T>(key);
    try {
      const raw = await this.client.get(key);
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch {
      return this.memoryFallback.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    if (!this.connected) {
      this.memoryFallback.set(key, value, ttlMs);
      return;
    }
    try {
      await this.client.set(key, JSON.stringify(value), "PX", ttlMs);
    } catch {
      this.memoryFallback.set(key, value, ttlMs);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected) { this.memoryFallback.delete(key); return; }
    try { await this.client.del(key); } catch { this.memoryFallback.delete(key); }
  }

  async clear(): Promise<void> {
    if (!this.connected) { this.memoryFallback.clear(); return; }
    try { await this.client.flushdb(); } catch { this.memoryFallback.clear(); }
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (!this.connected) { this.memoryFallback.invalidatePrefix(prefix); return; }
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length > 0) await this.client.del(...keys);
    } catch { this.memoryFallback.invalidatePrefix(prefix); }
  }

  async getStats() {
    if (!this.connected) return this.memoryFallback.stats;
    try {
      const info = await this.client.info("stats");
      const keyspace = await this.client.dbsize();
      return { size: keyspace, backend: "redis", info: info.split("\n").slice(0, 5) };
    } catch {
      return this.memoryFallback.stats;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      try { await this.client.quit(); } catch { this.client.disconnect(); }
      this.connected = false;
    }
  }

  get isConnected(): boolean { return this.connected; }
}

export const cache = new RedisCache();
