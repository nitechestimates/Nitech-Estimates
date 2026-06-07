import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("should allow requests under the limit", async () => {
    const res1 = await rateLimit("user1", 3);
    expect(res1.success).toBe(true);
    expect(res1.count).toBe(1);

    const res2 = await rateLimit("user1", 3);
    expect(res2.success).toBe(true);
    expect(res2.count).toBe(2);
  });

  it("should block requests exceeding the limit", async () => {
    await rateLimit("user2", 2);
    await rateLimit("user2", 2);
    
    const res = await rateLimit("user2", 2);
    expect(res.success).toBe(false);
    expect(res.count).toBe(3);
  });

  it("should reset counts after the window expires", async () => {
    await rateLimit("user3", 2);
    await rateLimit("user3", 2);

    // Fast-forward time past 60 seconds
    vi.advanceTimersByTime(60001);

    const res = await rateLimit("user3", 2);
    expect(res.success).toBe(true);
    expect(res.count).toBe(1);
  });

  describe("Redis branch", () => {
    beforeEach(() => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake-redis.upstash.io");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");
    });

    it("should use Redis and allow requests under the limit", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: 1 }, { result: -1 }],
      });
      global.fetch = mockFetch;

      const res = await rateLimit("redis-user1", 5, 60000);

      expect(mockFetch).toHaveBeenCalled();
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
    });

    it("should use Redis and block requests over the limit", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: 6 }, { result: 45 }],
      });
      global.fetch = mockFetch;

      const res = await rateLimit("redis-user2", 5, 60000);

      expect(res.success).toBe(false);
      expect(res.count).toBe(6);
      expect(res.reset).toBe(45000);
    });

    it("should set Redis expiry on first request (count === 1 or ttl === -1)", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ result: 1 }, { result: -1 }],
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      global.fetch = mockFetch;

      await rateLimit("redis-user3", 5, 60000);

      // Second call should be the expire call
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const expireCall = mockFetch.mock.calls[1];
      expect(expireCall[0]).toContain("/expire");
      expect(expireCall[1].body).toContain("rl:redis-user3");
    });

    it("should fallback to in-memory when Redis fetch fails", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Redis down"));
      global.fetch = mockFetch;

      const res1 = await rateLimit("fallback-user1", 2, 60000);
      const res2 = await rateLimit("fallback-user1", 2, 60000);
      const res3 = await rateLimit("fallback-user1", 2, 60000);

      expect(mockFetch).toHaveBeenCalled();
      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res3.success).toBe(false);
    });

    it("should fallback to in-memory when Redis returns non-ok status", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      global.fetch = mockFetch;

      const res = await rateLimit("fallback-user2", 3, 60000);

      expect(mockFetch).toHaveBeenCalled();
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
    });
  });
});
