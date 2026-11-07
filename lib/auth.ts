import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { StoreConfig } from './data';

export const ADMIN_COOKIE_NAME = 'lasanta_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Anti-Brute-Force Rate Limiter (Max 5 failed PIN attempts per 15 min window per IP)
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

interface EndpointBucketEntry {
  count: number;
  windowStart: number;
}

const globalForAuth = globalThis as unknown as {
  __lasantaEphemeralSecret?: string;
  __lasantaRateLimitMap?: Map<string, RateLimitEntry>;
  __lasantaEndpointBuckets?: Map<string, EndpointBucketEntry>;
};

const rateLimitMap =
  globalForAuth.__lasantaRateLimitMap ||
  (globalForAuth.__lasantaRateLimitMap = new Map<string, RateLimitEntry>());

const endpointBuckets =
  globalForAuth.__lasantaEndpointBuckets ||
  (globalForAuth.__lasantaEndpointBuckets = new Map<string, EndpointBucketEntry>());

function getServerSecret(): string {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured && configured.length >= 32) {
    return configured;
  }
  if (!globalForAuth.__lasantaEphemeralSecret) {
    globalForAuth.__lasantaEphemeralSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalForAuth.__lasantaEphemeralSecret;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip')?.trim() || '127.0.0.1';
}

export function checkPinRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0, remainingAttempts: MAX_PIN_ATTEMPTS };
  }

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
      remainingAttempts: 0,
    };
  }

  if (now - entry.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    rateLimitMap.delete(ip);
    return { allowed: true, retryAfterSeconds: 0, remainingAttempts: MAX_PIN_ATTEMPTS };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_PIN_ATTEMPTS - entry.attempts),
  };
}

export function recordPinAttempt(ip: string, success: boolean): void {
  if (success) {
    rateLimitMap.delete(ip);
    return;
  }
  const now = Date.now();
  const current = rateLimitMap.get(ip);
  if (!current || now - current.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    rateLimitMap.set(ip, {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: 0,
    });
    return;
  }

  const nextAttempts = current.attempts + 1;
  rateLimitMap.set(ip, {
    ...current,
    attempts: nextAttempts,
    lockedUntil: nextAttempts >= MAX_PIN_ATTEMPTS ? now + LOCKOUT_WINDOW_MS : 0,
  });
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const res = checkPinRateLimit(ip);
  return {
    allowed: res.allowed,
    ...(res.retryAfterSeconds > 0 ? { retryAfterSec: res.retryAfterSeconds } : {}),
  };
}

export function recordFailedPinAttempt(ip: string): void {
  recordPinAttempt(ip, false);
}

export function clearFailedPinAttempts(ip: string): void {
  recordPinAttempt(ip, true);
}

/**
 * Generic IP rate limiter for public endpoints (e.g. POST /api/orders, POST /api/orders/track).
 */
export function checkEndpointRateLimit(
  bucketName: string,
  ip: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const key = `${bucketName}:${ip}`;
  const current = endpointBuckets.get(key);

  if (!current || now - current.windowStart > windowMs) {
    endpointBuckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.windowStart + windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  current.count += 1;
  endpointBuckets.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Constant-time PIN comparison to prevent timing attacks.
 */
export function verifyPinSafe(inputPin: string, configuredPin: string): boolean {
  const effectivePin = (process.env.ADMIN_PIN || configuredPin || '1234').trim();
  const candidate = (inputPin || '').trim();
  if (!candidate || candidate.length !== effectivePin.length) {
    return false;
  }
  try {
    const bufA = Buffer.from(candidate, 'utf-8');
    const bufB = Buffer.from(effectivePin, 'utf-8');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Creates a signed HMAC-SHA256 session token for authenticated admins with a unique nonce (jti).
 */
export function createAdminSessionToken(): string {
  const now = Date.now();
  const payload = JSON.stringify({
    role: 'admin',
    jti: crypto.randomBytes(12).toString('hex'),
    iat: now,
    exp: now + SESSION_TTL_MS,
  });
  const payloadB64 = Buffer.from(payload, 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getServerSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a signed HMAC-SHA256 admin session token.
 */
export function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return false;
  }
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return false;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getServerSecret())
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf-8');
    const expBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (decoded.role !== 'admin' || typeof decoded.exp !== 'number') {
      return false;
    }
    return Date.now() < decoded.exp;
  } catch {
    return false;
  }
}

/**
 * Checks whether an incoming NextRequest has a valid admin session cookie.
 */
export function isAdminRequest(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (verifyAdminSessionToken(cookieToken)) {
    return true;
  }
  const headerToken = req.headers.get('x-admin-token');
  if (verifyAdminSessionToken(headerToken)) {
    return true;
  }
  return false;
}

/**
 * Standard 401 response for unauthorized API mutations.
 */
export function unauthorizedResponse(
  message = 'No autorizado. Inicia sesión como administrador para realizar esta operación.'
) {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

/**
 * Attaches the HttpOnly admin session cookie to a NextResponse.
 */
export function setAdminSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}

/**
 * Clears the HttpOnly admin session cookie.
 */
export function clearAdminSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}

/**
 * Strips sensitive fields (adminPin) from StoreConfig before sending to clients.
 */
export function sanitizePublicStoreConfig(config: StoreConfig): StoreConfig {
  return {
    ...config,
    adminPin: '',
  };
}
