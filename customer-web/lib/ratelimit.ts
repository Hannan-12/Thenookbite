import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Returns null if Redis env vars are missing — rate limiting is skipped in dev
function makeRatelimiter(requests: number, windowSeconds: number) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: false,
  });
}

// Pre-built limiters
const checkInLimiter   = makeRatelimiter(5, 60);   // 5 check-in attempts / min per IP
const orderLimiter     = makeRatelimiter(30, 60);  // 30 order creates / min per IP
const lookupLimiter    = makeRatelimiter(20, 60);  // 20 customer-lookup calls / min per IP

export type LimiterKey = 'checkin' | 'order' | 'lookup';

const limiters: Record<LimiterKey, ReturnType<typeof makeRatelimiter>> = {
  checkin: checkInLimiter,
  order:   orderLimiter,
  lookup:  lookupLimiter,
};

export async function checkRateLimit(req: NextRequest, key: LimiterKey): Promise<NextResponse | null> {
  const limiter = limiters[key];
  if (!limiter) return null; // no Redis configured — allow

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { detail: 'Too many requests. Please wait before trying again.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset':     String(reset),
          'Retry-After':           String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    );
  }

  return null;
}
