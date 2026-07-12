import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ioredis", () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    flushdb: vi.fn(),
    info: vi.fn(),
    dbsize: vi.fn(),
    quit: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  };
  return { default: vi.fn(() => mockRedis) };
});

vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("Cache", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("MemoryCache stores and retrieves values", async () => {
    const { MemoryCache } = await import("../utils/cache.js");
    const cache = new (MemoryCache as any)();
    cache.set("key1", { data: 42 }, 60000);
    expect(cache.get("key1")).toEqual({ data: 42 });
  });

  it("MemoryCache returns undefined for missing keys", async () => {
    const { MemoryCache } = await import("../utils/cache.js");
    const cache = new (MemoryCache as any)();
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("MemoryCache invalidates by prefix", async () => {
    const { MemoryCache } = await import("../utils/cache.js");
    const cache = new (MemoryCache as any)();
    cache.set("user:1", "a");
    cache.set("user:2", "b");
    cache.set("org:1", "c");
    cache.invalidatePrefix("user:");
    expect(cache.get("user:1")).toBeUndefined();
    expect(cache.get("org:1")).toBe("c");
  });

  it("MemoryCache evicts old entries when over limit", async () => {
    const mod = await import("../utils/cache.js");
    const limit = mod.MAX_MEMORY_CACHE_ITEMS;
    if (limit < 5) return;
    const cache = new (mod.MemoryCache as any)();
    for (let i = 0; i < limit + 2; i++) {
      cache.set(`key${i}`, i, 60000);
    }
    expect(cache.stats.size).toBeLessThanOrEqual(limit + 1);
  });

  it("MemoryCache reports hit/miss stats", async () => {
    const { MemoryCache } = await import("../utils/cache.js");
    const cache = new (MemoryCache as any)();
    cache.set("hit", 1, 60000);
    cache.get("hit");
    cache.get("miss");
    const stats = cache.stats;
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.ratio).toBe("0.500");
  });
});
