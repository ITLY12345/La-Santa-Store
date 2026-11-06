import { NextRequest, NextResponse } from 'next/server';
import { readDbAsync } from '@/lib/server-db';
import {
  verifyPinSafe,
  createAdminSessionToken,
  isAdminRequest,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  sanitizePublicStoreConfig,
  getClientIp,
  checkPinRateLimit,
  recordPinAttempt,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authenticated = isAdminRequest(req);
  if (!authenticated) {
    return NextResponse.json({ authenticated: false });
  }
  const db = await readDbAsync();
  return NextResponse.json({
    authenticated: true,
    orders: db.orders,
    plugins: db.plugins,
    notifications: db.notifications,
    storeConfig: sanitizePublicStoreConfig(db.storeConfig),
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateStatus = checkPinRateLimit(ip);

    if (!rateStatus.allowed) {
      const minutes = Math.ceil(rateStatus.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          locked: true,
          retryAfterSeconds: rateStatus.retryAfterSeconds,
          message: `Demasiados intentos fallidos. Acceso bloqueado temporalmente por ${minutes} min por seguridad.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateStatus.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json();
    const pin = typeof body?.pin === 'string' ? body.pin : '';
    const db = await readDbAsync();

    const isValid = verifyPinSafe(pin, db.storeConfig.adminPin);
    recordPinAttempt(ip, isValid);

    if (!isValid) {
      const updatedRate = checkPinRateLimit(ip);
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          remainingAttempts: updatedRate.remainingAttempts,
          message:
            updatedRate.remainingAttempts > 0
              ? `Código PIN inválido. Intentos restantes antes de bloqueo: ${updatedRate.remainingAttempts}.`
              : 'Se agotaron los intentos permitidos. Tu IP ha sido bloqueada por 15 minutos.',
        },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    const res = NextResponse.json({
      success: true,
      authenticated: true,
      orders: db.orders,
      plugins: db.plugins,
      notifications: db.notifications,
      storeConfig: sanitizePublicStoreConfig(db.storeConfig),
    });

    return setAdminSessionCookie(res, token);
  } catch (err) {
    console.error('POST /api/auth error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al autenticar sesión administrativa.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, authenticated: false });
  return clearAdminSessionCookie(res);
}
