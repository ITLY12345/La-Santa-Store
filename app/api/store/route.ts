import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getInitialDb } from '@/lib/server-db';

export async function GET() {
  const db = readDb();
  return NextResponse.json(db);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();

    if (body.action === 'reset') {
      const fresh = writeDb(getInitialDb());
      return NextResponse.json({ success: true, db: fresh });
    }

    if (body.action === 'markNotificationsRead') {
      db.notifications = db.notifications.map((n) => ({ ...n, leida: true }));
      const saved = writeDb(db);
      return NextResponse.json({ success: true, notifications: saved.notifications });
    }

    if (body.storeConfig) {
      db.storeConfig = {
        ...db.storeConfig,
        ...body.storeConfig,
      };
      const saved = writeDb(db);
      return NextResponse.json({ success: true, storeConfig: saved.storeConfig });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (err) {
    console.error('PUT /api/store error:', err);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
