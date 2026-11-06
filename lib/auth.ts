import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { StoreConfig } from './data';

export const ADMIN_COOKIE_NAME = 'lasanta_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getServerSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.WEBHOOK_SECRET ||
    'lasanta-store-cartagena-hmac-secret-2026-prod'
  );
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
 * Creates a signed HMAC-SHA256 session token for authenticated admins.
 */
export function createAdminSessionToken(): string {
  const now = Date.now();
  const payload = JSON.stringify({
    role: 'admin',
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

