import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  readDbAsync,
  writeDbAsync,
  getFormattedNow,
  createOrderStatusNotification,
} from '@/lib/server-db';
import { isAdminRequest, unauthorizedResponse } from '@/lib/auth';

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    const bufA = Buffer.from(signatureHeader.trim(), 'utf-8');
    const bufB = Buffer.from(expected, 'utf-8');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-webhook-signature') || req.headers.get('x-signature');

    // Require either a valid HMAC webhook signature OR an authenticated admin session
    const isAuthorized =
      isAdminRequest(req) || verifyWebhookSignature(rawBody, signature);

    if (!isAuthorized) {
      return unauthorizedResponse(
        'Firma criptográfica de webhook ausente o inválida.'
      );
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') || 'generic';
    const payload = JSON.parse(rawBody || '{}');
    const db = await readDbAsync();

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
          guiaSeguimiento:
            payload.guiaSeguimiento ||
            ord.guiaSeguimiento ||
            `CTG-${Date.now().toString().slice(-6)}`,
          fechaDespacho: payload.estado === 'Despachado' ? getFormattedNow() : ord.fechaDespacho,
          fechaEntrega: payload.estado === 'Entregado' ? getFormattedNow() : ord.fechaEntrega,
        };
        db.orders[idx] = updatedOrder;

        const notif = createOrderStatusNotification(updatedOrder, payload.estado);
        db.notifications = [notif, ...db.notifications];
        await writeDbAsync(db);

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
      status: 'Webhook autenticado y recibido correctamente en servidor Cartagena',
    });
  } catch (err) {
    console.error('POST /api/webhooks error:', err);
    return NextResponse.json(
      { success: false, message: 'Error procesando webhook' },
      { status: 500 }
    );
  }
}
