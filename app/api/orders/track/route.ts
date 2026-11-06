import { NextRequest, NextResponse } from 'next/server';
import { readDbAsync } from '@/lib/server-db';
import { Order } from '@/lib/data';
import { isAdminRequest, getClientIp, checkEndpointRateLimit } from '@/lib/auth';

function maskOrderForPublic(order: Order): Order {
  const parts = (order.clienteNombre || '').trim().split(/\s+/);
  const maskedName =
    parts.length > 1
      ? `${parts[0]} ${parts[1][0]}.`
      : parts[0] || 'Cliente';

  const dir = order.clienteDireccion || '';
  const maskedAddress =
    dir.length > 14 ? `${dir.slice(0, 12)}•••` : dir;

  return {
    ...order,
    clienteNombre: maskedName,
    clienteDocumento: order.clienteDocumento ? '••••' : '',
    clienteTelefono: order.clienteTelefono
      ? `••••${order.clienteTelefono.slice(-4)}`
      : '',
    clienteDireccion: maskedAddress,
  };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkEndpointRateLimit('order_track', ip, 30, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: 'Demasiadas consultas seguidas. Intenta de nuevo en unos segundos.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const orderIds: string[] = Array.isArray(body?.orderIds) ? body.orderIds.slice(0, 25) : [];
    const query: string = typeof body?.query === 'string' ? body.query.trim().toLowerCase() : '';
    const isAdmin = isAdminRequest(req);

    const db = await readDbAsync();

    if (isAdmin) {
      return NextResponse.json({
        success: true,
        orders: db.orders,
        notifications: db.notifications,
      });
    }

    const idSet = new Set(orderIds);
    const matchedOrders = db.orders.filter((o) => {
      if (idSet.has(o.id) || idSet.has(o.orderNumber)) {
        return true;
      }
      if (query && query.length >= 4) {
        const cleanQuery = query.replace(/^#/, '');
        const cleanOrd = o.orderNumber.toLowerCase().replace(/^#/, '');
        const cleanFac = (o.invoiceNumber || '').toLowerCase();
        const cleanGuia = (o.guiaSeguimiento || '').toLowerCase();
        return (
          cleanOrd === cleanQuery ||
          cleanFac === cleanQuery ||
          (cleanGuia.length >= 4 && cleanGuia === cleanQuery)
        );
      }
      return false;
    });

    const matchedIdSet = new Set(matchedOrders.map((o) => o.id));
    const matchedNotifications = db.notifications.filter((n) =>
      matchedIdSet.has(n.orderId)
    );

    return NextResponse.json({
      success: true,
      orders: matchedOrders.map(maskOrderForPublic),
      notifications: matchedNotifications,
    });
  } catch (err) {
    console.error('POST /api/orders/track error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al consultar el estado del pedido.' },
      { status: 500 }
    );
  }
}
