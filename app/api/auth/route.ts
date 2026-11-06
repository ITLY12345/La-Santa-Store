import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/server-db';
import {
  verifyPinSafe,
  createAdminSessionToken,
  isAdminRequest,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  sanitizePublicStoreConfig,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authenticated = isAdminRequest(req);
  if (!authenticated) {
    return NextResponse.json({ authenticated: false });
  }
  const db = readDb();
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
    const body = await req.json();
    const pin = typeof body?.pin === 'string' ? body.pin : '';
    const db = readDb();

    if (!verifyPinSafe(pin, db.storeConfig.adminPin)) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          message: 'Código PIN inválido. Verifica tus credenciales de administrador.',
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

