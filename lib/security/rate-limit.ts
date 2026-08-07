import { NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipStore = new Map<string, RateLimitRecord>();

// Cleanup stale IP entries every 10 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
  }, 10 * 60 * 1000);
}

/**
 * In-memory sliding window Rate Limiter for Next.js API Routes
 * @param req Request object
 * @param limit Maximum requests allowed in timeframe
 * @param windowMs Timeframe in milliseconds (default 60 seconds)
 */
export function checkRateLimit(
  req: Request,
  limit = 20,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number; response?: NextResponse } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const now = Date.now();
  let record = ipStore.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    ipStore.set(ip, record);
    return { allowed: true, remaining: limit - 1, resetTime: record.resetTime };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`,
        retryAfterSeconds: retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(record.resetTime),
        },
      }
    );
    return { allowed: false, remaining: 0, resetTime: record.resetTime, response };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}
