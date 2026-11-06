import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getFormattedNow } from '@/lib/server-db';
import { isAdminRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }
  const db = readDb();
  return NextResponse.json({ plugins: db.plugins });
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const db = readDb();
    const { pluginId, activo, modo, publicKey } = body;

    db.plugins = db.plugins.map((plg) => {
      if (plg.id !== pluginId) return plg;
      return {
        ...plg,
        activo: activo !== undefined ? Boolean(activo) : plg.activo,
        modo: modo || plg.modo,
        publicKey: publicKey !== undefined ? publicKey : plg.publicKey,
        ultimaSincronizacion: `Actualizado ${getFormattedNow()}`,
      };
    });

    const saved = writeDb(db);
    return NextResponse.json({ success: true, plugins: saved.plugins });
  } catch (err) {
    console.error('PUT /api/plugins error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar el conector de plugin.' },
      { status: 500 }
    );
  }
}
