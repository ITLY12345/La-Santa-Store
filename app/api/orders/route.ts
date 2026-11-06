import { NextRequest, NextResponse } from 'next/server';
import {
  readDb,
  writeDb,
  getFormattedNow,
  isStockCommittedState,
  reconcileStockItems,
  createOrderStatusNotification,
} from '@/lib/server-db';
import { Order, formatCOP, EstadoPedido, CartItem } from '@/lib/data';
import {
  isAdminRequest,
  unauthorizedResponse,
  sanitizePublicStoreConfig,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }
  const db = readDb();
  return NextResponse.json({
    orders: db.orders,
    notifications: db.notifications,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();
    const formattedDate = getFormattedNow();
    const isAdmin = isAdminRequest(req);

    // Case 1: Direct POS Invoice Creation (Deducts stock immediately - Admin only)
    if (body.origen === 'POS Interno') {
      if (!isAdmin) {
        return unauthorizedResponse();
      }

      const items = body.items || [];
      if (items.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Agrega al menos un producto a la factura POS.' },
          { status: 400 }
        );
      }

      const estadoInicial: EstadoPedido = body.estado || 'Facturado';
      const shouldDeduct = isStockCommittedState(estadoInicial);

      const stockResult = reconcileStockItems(db.products, [], false, items, shouldDeduct);
      if (!stockResult.success) {
        return NextResponse.json(
          { success: false, message: stockResult.errorMessage },
          { status: 400 }
        );
      }

      const nextSeq = db.storeConfig.nextInvoiceSequence || 1003;
      const invoiceNum = `FAC-${nextSeq}`;
      const orderNum = `#POS-${nextSeq}`;
      const subtotal = items.reduce(
        (acc: number, it: { precio: number; cantidad: number }) => acc + it.precio * it.cantidad,
        0
      );
      const envio = Math.max(0, Number(body.costoEnvio) || 0);
      const descuento = Math.max(0, Number(body.descuentoManual) || 0);
      const total = Math.max(0, subtotal + envio - descuento);

      const newOrder: Order = {
        id: typeof body.id === 'string' && body.id.startsWith('pos-') ? body.id : `pos-${Date.now()}`,
        orderNumber: orderNum,
        invoiceNumber: invoiceNum,
        fecha: formattedDate,
        fechaFacturacion: formattedDate,
        fechaDespacho:
          estadoInicial === 'Despachado' || estadoInicial === 'Entregado'
            ? formattedDate
            : undefined,
        fechaEntrega: estadoInicial === 'Entregado' ? formattedDate : undefined,
        origen: 'POS Interno',
        clienteNombre: (body.clienteNombre || 'Cliente Mostrador Cartagena').trim(),
        clienteDocumento: (body.clienteDocumento || '222222222222').trim(),
        clienteTelefono: (body.clienteTelefono || '').trim(),
        clienteDireccion: (
          body.clienteDireccion || 'Punto de Venta Cartagena de Indias'
        ).trim(),
        transportadora: body.transportadora || '',
        guiaSeguimiento: body.guiaSeguimiento || '',
        items,
        subtotal,
        costoEnvio: envio,
        descuentoManual: descuento,
        envioTexto: envio > 0 ? formatCOP(envio) : 'Sin costo / Local Cartagena',
        total,
        estado: estadoInicial,
        metodoPagoInterno: body.metodoPagoInterno || 'Efectivo',
        stockDeducted: shouldDeduct,
        notas: body.notas || '',
        referenceUrl: `https://store.app/factura/${invoiceNum}`,
      };

      db.products = stockResult.products;
      db.orders = [newOrder, ...db.orders];
      db.storeConfig.nextInvoiceSequence = nextSeq + 1;

      if (estadoInicial === 'Despachado' || estadoInicial === 'Entregado') {
        const notif = createOrderStatusNotification(newOrder, estadoInicial);
        db.notifications = [notif, ...db.notifications];
      }

      const saved = writeDb(db);
      return NextResponse.json({
        success: true,
        order: newOrder,
        products: saved.products,
        orders: saved.orders,
        storeConfig: sanitizePublicStoreConfig(saved.storeConfig),
        notifications: saved.notifications,
      });
    }

    // Case 2: Customer WhatsApp Order Creation (Starts as Pendiente)
    const rawItems: CartItem[] = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'El pedido debe incluir al menos un producto.' },
        { status: 400 }
      );
    }

    // Verify prices against server catalog to prevent client-side price tampering
    const verifiedItems: CartItem[] = rawItems.map((it) => {
      const serverProd = db.products.find((p) => p.id === it.productoId);
      const unitPrice = serverProd ? serverProd.precio_base : Math.max(0, Number(it.precio) || 0);
      const qty = Math.max(1, Math.min(99, Math.floor(Number(it.cantidad) || 1)));
      return {
        ...it,
        precio: unitPrice,
        cantidad: qty,
      };
    });

    const subtotal = verifiedItems.reduce(
      (acc, it) => acc + it.precio * it.cantidad,
      0
    );

    // Unify orderNumber between client WhatsApp link and backend database
    const requestedOrderNum =
      typeof body.orderNumber === 'string' && /^#ORD-\d{4,8}$/.test(body.orderNumber.trim())
        ? body.orderNumber.trim()
        : null;
    const isCollision =
      requestedOrderNum && db.orders.some((o) => o.orderNumber === requestedOrderNum);
    const orderNum =
      requestedOrderNum && !isCollision
        ? requestedOrderNum
        : `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const requestedId =
      typeof body.id === 'string' && /^ord-[\w-]+$/.test(body.id.trim())
        ? body.id.trim()
        : null;
    const orderId =
      requestedId && !db.orders.some((o) => o.id === requestedId)
        ? requestedId
        : `ord-${Date.now()}`;

    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum,
      fecha: formattedDate,
      origen: 'WhatsApp',
      clienteNombre: (body.clienteNombre || 'Cliente WhatsApp').trim().slice(0, 120),
      clienteDocumento: (body.clienteDocumento || '').trim().slice(0, 40),
      clienteDireccion: (body.clienteDireccion || 'Cartagena de Indias · Por confirmar')
        .trim()
        .slice(0, 200),
      clienteTelefono: (body.clienteTelefono || '').trim().slice(0, 40),
      items: verifiedItems,
      subtotal,
      costoEnvio: 0,
      descuentoManual: 0,
      envioTexto: db.storeConfig.deliveryNote,
      total: subtotal,
      estado: 'Pendiente',
      metodoPagoInterno: 'Por definir',
      stockDeducted: false,
      notas: typeof body.notas === 'string' ? body.notas.slice(0, 500) : '',
      referenceUrl:
        body.referenceUrl || `https://lasanta.store/pedido/${orderNum.replace('#', '')}`,
    };

    db.orders = [newOrder, ...db.orders];
    const saved = writeDb(db);

    return NextResponse.json({
      success: true,
      order: newOrder,
      ...(isAdmin ? { orders: saved.orders } : {}),
    });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al registrar el pedido o factura.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const db = readDb();
    const { orderId } = body;

    const targetIndex = db.orders.findIndex((o) => o.id === orderId);
    if (targetIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Factura o pedido no encontrado.' },
        { status: 404 }
      );
    }

    const existingOrder = db.orders[targetIndex];
    const formattedDate = getFormattedNow();

    const nextEstado: EstadoPedido = body.estado || existingOrder.estado;
    const nextItems = Array.isArray(body.items) ? body.items : existingOrder.items;

    if (nextItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'La factura debe contener al menos un producto.' },
        { status: 400 }
      );
    }

    const shouldDeductNext = isStockCommittedState(nextEstado);

    // Reconcile stock between previous state/items and new state/items
    const stockRes = reconcileStockItems(
      db.products,
      existingOrder.items,
      existingOrder.stockDeducted,
      nextItems,
      shouldDeductNext
    );

    if (!stockRes.success) {
      return NextResponse.json(
        { success: false, message: stockRes.errorMessage },
        { status: 400 }
      );
    }

    let assignedInvoice = existingOrder.invoiceNumber;
    let fechaFacturacion = existingOrder.fechaFacturacion;
    let fechaDespacho = existingOrder.fechaDespacho;
    let fechaEntrega = existingOrder.fechaEntrega;
    const nextSeq = db.storeConfig.nextInvoiceSequence || 1003;

    // Assign official invoice number if entering a committed state without one
    if (shouldDeductNext && !assignedInvoice) {
      assignedInvoice = `FAC-${nextSeq}`;
      fechaFacturacion = formattedDate;
      db.storeConfig.nextInvoiceSequence = nextSeq + 1;
    }

    if (nextEstado === 'Despachado' && !fechaDespacho) {
      fechaDespacho = formattedDate;
    }
    if (nextEstado === 'Entregado' && !fechaEntrega) {
      fechaEntrega = formattedDate;
      if (!fechaDespacho) fechaDespacho = formattedDate;
    }

    const subtotal = nextItems.reduce(
      (acc: number, it: { precio: number; cantidad: number }) => acc + it.precio * it.cantidad,
      0
    );
    const envio =
      body.costoEnvio !== undefined
        ? Math.max(0, Number(body.costoEnvio) || 0)
        : existingOrder.costoEnvio;
    const descuento =
      body.descuentoManual !== undefined
        ? Math.max(0, Number(body.descuentoManual) || 0)
        : existingOrder.descuentoManual || 0;
    const total = Math.max(0, subtotal + envio - descuento);

    const updatedOrder: Order = {
      ...existingOrder,
      invoiceNumber: assignedInvoice,
      fechaFacturacion,
      fechaDespacho,
      fechaEntrega,
      clienteNombre:
        body.clienteNombre !== undefined
          ? body.clienteNombre.trim() || existingOrder.clienteNombre
          : existingOrder.clienteNombre,
      clienteDocumento:
        body.clienteDocumento !== undefined
          ? body.clienteDocumento.trim()
          : existingOrder.clienteDocumento,
      clienteTelefono:
        body.clienteTelefono !== undefined
          ? body.clienteTelefono.trim()
          : existingOrder.clienteTelefono,
      clienteDireccion:
        body.clienteDireccion !== undefined
          ? body.clienteDireccion.trim() || existingOrder.clienteDireccion
          : existingOrder.clienteDireccion,
      transportadora:
        body.transportadora !== undefined
          ? body.transportadora.trim()
          : existingOrder.transportadora,
      guiaSeguimiento:
        body.guiaSeguimiento !== undefined
          ? body.guiaSeguimiento.trim()
          : existingOrder.guiaSeguimiento,
      items: nextItems,
      subtotal,
      costoEnvio: envio,
      descuentoManual: descuento,
      envioTexto:
        envio > 0
          ? formatCOP(envio)
          : shouldDeductNext
          ? 'Gratis / Local Cartagena'
          : existingOrder.envioTexto,
      total,
      estado: nextEstado,
      metodoPagoInterno: body.metodoPagoInterno || existingOrder.metodoPagoInterno,
      stockDeducted: shouldDeductNext,
      notas: body.notas !== undefined ? body.notas : existingOrder.notas,
    };

    db.products = stockRes.products;
    db.orders[targetIndex] = updatedOrder;

    // Trigger Push Notification if status changed to 'Despachado' or 'Entregado'
    let createdNotification = null;
    if (
      (nextEstado === 'Despachado' || nextEstado === 'Entregado') &&
      existingOrder.estado !== nextEstado
    ) {
      createdNotification = createOrderStatusNotification(updatedOrder, nextEstado);
      db.notifications = [createdNotification, ...db.notifications];
    }

    const saved = writeDb(db);
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      createdNotification,
      products: saved.products,
      orders: saved.orders,
      storeConfig: sanitizePublicStoreConfig(saved.storeConfig),
      notifications: saved.notifications,
    });
  } catch (err) {
    console.error('PUT /api/orders error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar o modificar la factura.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID de factura/pedido requerido.' },
        { status: 400 }
      );
    }

    const db = readDb();
    const target = db.orders.find((o) => o.id === id);
    if (!target) {
      return NextResponse.json(
        { success: false, message: 'Registro no encontrado.' },
        { status: 404 }
      );
    }

    // If stock was deducted, restore it to inventory before deleting the invoice
    if (target.stockDeducted) {
      const stockRes = reconcileStockItems(
        db.products,
        target.items,
        true,
        [],
        false
      );
      db.products = stockRes.products;
    }

    db.orders = db.orders.filter((o) => o.id !== id);
    db.notifications = db.notifications.filter((n) => n.orderId !== id);

    const saved = writeDb(db);
    return NextResponse.json({
      success: true,
      products: saved.products,
      orders: saved.orders,
      notifications: saved.notifications,
    });
  } catch (err) {
    console.error('DELETE /api/orders error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al eliminar la factura.' },
      { status: 500 }
    );
  }
}
