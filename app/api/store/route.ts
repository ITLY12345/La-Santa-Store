import { NextRequest, NextResponse } from 'next/server';
import { readDbAsync, writeDbAsync, getInitialDb } from '@/lib/server-db';
import {
  isAdminRequest,
  unauthorizedResponse,
  sanitizePublicStoreConfig,
  verifyPinSafe,
  hashPin,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  const db = await readDbAsync();
  const isAdmin = isAdminRequest(req);

  if (isAdmin) {
    return NextResponse.json({
      isAdmin: true,
      products: db.products,
      orders: db.orders,
      storeConfig: sanitizePublicStoreConfig(db.storeConfig),
      plugins: db.plugins,
      notifications: db.notifications,
      stockMoves: db.stockMoves || [],
      updatedAt: db.updatedAt,
    });
  }

  // Filter out internal cost margins for public storefront
  const publicProducts = db.products.map(
    ({ costo_unitario: _c, configuracion_alertas: _a, ...rest }) => rest
  );

  return NextResponse.json({
    isAdmin: false,
    products: publicProducts,
    storeConfig: sanitizePublicStoreConfig(db.storeConfig),
    updatedAt: db.updatedAt,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await readDbAsync();
    const isAdmin = isAdminRequest(req);

    if (body.action === 'markNotificationsRead') {
      if (!isAdmin) {
        return NextResponse.json({ success: true });
      }
      db.notifications = db.notifications.map((n) => ({ ...n, leida: true }));
      const saved = await writeDbAsync(db);
      return NextResponse.json({
        success: true,
        notifications: saved.notifications,
      });
    }

    if (!isAdmin) {
      return unauthorizedResponse();
    }

    if (body.action === 'reset') {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {
            success: false,
            message: 'La restauración completa de base de datos está deshabilitada en entorno de producción por seguridad.',
          },
          { status: 403 }
        );
      }
      const fresh = await writeDbAsync(getInitialDb());
      return NextResponse.json({
        success: true,
        db: {
          ...fresh,
          storeConfig: sanitizePublicStoreConfig(fresh.storeConfig),
        },
      });
    }

    if (body.storeConfig) {
      const incomingPin =
        typeof body.storeConfig.adminPin === 'string'
          ? body.storeConfig.adminPin.trim()
          : '';

      if (incomingPin.length >= 4) {
        const providedCurrentPin =
          typeof body.currentPin === 'string' ? body.currentPin.trim() : '';
        if (
          !providedCurrentPin ||
          !verifyPinSafe(providedCurrentPin, db.storeConfig.adminPin)
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                'Por seguridad debes ingresar el PIN actual correcto para poder modificar el PIN administrativo.',
            },
            { status: 403 }
          );
        }
      }

      // Do not allow mass-assigning read-only sequences or unapproved internal props
      const {
        nextInvoiceSequence: _seq,
        nextCreditNoteSequence: _nc,
        nextOrderSequence: _ord,
        ...allowedUpdates
      } = body.storeConfig;

      db.storeConfig = {
        ...db.storeConfig,
        ...allowedUpdates,
        adminPin:
          incomingPin.length >= 4 ? hashPin(incomingPin) : db.storeConfig.adminPin,
      };
      const saved = await writeDbAsync(db);
      return NextResponse.json({
        success: true,
        storeConfig: sanitizePublicStoreConfig(saved.storeConfig),
      });
    }

    return NextResponse.json(
      { success: false, message: 'Acción no reconocida' },
      { status: 400 }
    );
  } catch (err) {
    console.error('PUT /api/store error:', err);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
