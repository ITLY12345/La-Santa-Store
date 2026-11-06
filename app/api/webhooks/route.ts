import { NextRequest, NextResponse } from 'next/server';
import {
  readDb,
  writeDb,
  getFormattedNow,
  createOrderStatusNotification,
} from '@/lib/server-db';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') || 'generic';
    const payload = await req.json();
    const db = readDb();

    // Update order status if webhook provides orderId / orderNumber and newStatus
    if (payload.orderId || payload.orderNumber) {
      const idx = db.orders.findIndex(
        (o) => o.id === payload.orderId || o.orderNumber === payload.orderNumber
      );

      if (idx > -1 && (payload.estado === 'Despachado' || payload.estado === 'Entregado')) {
        const ord = db.orders[idx];
        const updatedOrder = {
          ...ord,
          estado: payload.estado,
          transportadora: payload.transportadora || ord.transportadora || provider.toUpperCase(),
          guiaSeguimiento: payload.guiaSeguimiento || ord.guiaSeguimiento || `CTG-${Date.now().toString().slice(-6)}`,
          fechaDespacho: payload.estado === 'Despachado' ? getFormattedNow() : ord.fechaDespacho,
          fechaEntrega: payload.estado === 'Entregado' ? getFormattedNow() : ord.fechaEntrega,
        };
        db.orders[idx] = updatedOrder;

        const notif = createOrderStatusNotification(updatedOrder, payload.estado);
        db.notifications = [notif, ...db.notifications];
        writeDb(db);

        return NextResponse.json({
          success: true,
          provider,
          message: `Webhook procesado y notificación Push emitida para ${updatedOrder.orderNumber}`,
          order: updatedOrder,
          notification: notif,
        });
      }
    }

    return NextResponse.json({
      success: true,
      provider,
      receivedAt: getFormattedNow(),
      status: 'Webhook recibido correctamente en servidor Cartagena',
    });
  } catch (err) {
    console.error('POST /api/webhooks error:', err);
    return NextResponse.json(
      { success: false, message: 'Error procesando webhook' },
      { status: 500 }
    );
  }
}
