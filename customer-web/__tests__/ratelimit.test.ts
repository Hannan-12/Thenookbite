import { describe, it, expect, vi } from 'vitest';

// Test the graceful fallback when Redis env vars are missing
// We test the shape/contract, not the actual Redis connection
describe('Rate limiter graceful degradation', () => {
  it('returns null (allow) when UPSTASH env vars are missing', async () => {
    // Ensure env vars are absent
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    // Re-import with no env vars set
    const { checkRateLimit } = await import('../lib/ratelimit');

    const mockReq = {
      headers: { get: () => '127.0.0.1' },
    } as unknown as Request;

    // @ts-expect-error minimal mock
    const result = await checkRateLimit(mockReq, 'checkin');
    expect(result).toBeNull(); // null = allowed through
  });
});
