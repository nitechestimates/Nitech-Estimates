import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
});
