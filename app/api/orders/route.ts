import { NextRequest, NextResponse } from 'next/server';
import {
  readDbAsync,
  writeDbAsync,
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
  getClientIp,
  checkEndpointRateLimit,
} from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }
  const db = await readDbAsync();
  return NextResponse.json({
    orders: db.orders,
    notifications: db.notifications,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await readDbAsync();
    const formattedDate = getFormattedNow();
    const isAdmin = isAdminRequest(req);

    // Case 1: Direct POS Invoice Creation (Deducts stock immediately - Admin only)
    if (body.origen === 'POS Interno') {
      if (!isAdmin) {
        return unauthorizedResponse();
      }

      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0 || items.length > 50) {
        return NextResponse.json(
          { success: false, message: 'Agrega entre 1 y 50 productos a la factura POS.' },
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
        clienteNombre: (body.clienteNombre || 'Cliente Mostrador Cartagena').trim().slice(0, 120),
        clienteDocumento: (body.clienteDocumento || '222222222222').trim().slice(0, 40),
        clienteTelefono: (body.clienteTelefono || '').trim().slice(0, 40),
        clienteDireccion: (
          body.clienteDireccion || 'Punto de Venta Cartagena de Indias'
        )
          .trim()
          .slice(0, 200),
        transportadora: (body.transportadora || '').trim().slice(0, 80),
        guiaSeguimiento: (body.guiaSeguimiento || '').trim().slice(0, 80),
        items,
        subtotal,
        costoEnvio: envio,
        descuentoManual: descuento,
        envioTexto: envio > 0 ? formatCOP(envio) : 'Sin costo / Local Cartagena',
        total,
        estado: estadoInicial,
        metodoPagoInterno: body.metodoPagoInterno || 'Efectivo',
        stockDeducted: shouldDeduct,
        notas: typeof body.notas === 'string' ? body.notas.slice(0, 500) : '',
        referenceUrl: `https://lasantastore.enigmaproducciones.com/factura/${invoiceNum}`,
      };

      db.products = stockResult.products;
      db.orders = [newOrder, ...db.orders];
      db.storeConfig.nextInvoiceSequence = nextSeq + 1;

      if (estadoInicial === 'Despachado' || estadoInicial === 'Entregado') {
        const notif = createOrderStatusNotification(newOrder, estadoInicial);
        db.notifications = [notif, ...db.notifications];
      }

      const saved = await writeDbAsync(db);
      return NextResponse.json({
        success: true,
        order: newOrder,
        products: saved.products,
        orders: saved.orders,
        storeConfig: sanitizePublicStoreConfig(saved.storeConfig),
        notifications: saved.notifications,
      });
    }

    // Case 2: Customer WhatsApp Order Creation (Public endpoint -> Rate-limited & strictly validated)
    const ip = getClientIp(req);
    const rateLimit = checkEndpointRateLimit('whatsapp_order_create', ip, 10, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Has enviado demasiados pedidos recientemente. Espera unos minutos antes de intentar de nuevo.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const rawItems: CartItem[] = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0 || rawItems.length > 30) {
      return NextResponse.json(
        { success: false, message: 'El pedido debe incluir entre 1 y 30 productos válidos.' },
        { status: 400 }
      );
    }

    // Strict verification: Every item MUST match an existing product and variant in the server catalog
    const verifiedItems: CartItem[] = [];
    for (const it of rawItems) {
      const serverProd = db.products.find((p) => p.id === it.productoId);
      const serverVariant = serverProd?.variantes.find((v) => v.id_variante === it.varianteId);

      if (!serverProd || !serverVariant) {
        return NextResponse.json(
          {
            success: false,
            message: 'Uno de los productos o tallas seleccionadas no existe en el catálogo oficial.',
          },
          { status: 400 }
        );
      }

      const qty = Math.max(1, Math.min(99, Math.floor(Number(it.cantidad) || 1)));
      verifiedItems.push({
        cartItemId: `${serverProd.id}_${serverVariant.id_variante}`,
        productoId: serverProd.id,
        varianteId: serverVariant.id_variante,
        nombre: serverProd.nombre,
        categoria: serverProd.categoria,
        marca_motivo: serverProd.marca_motivo,
        talla: serverVariant.talla,
        color: serverVariant.color,
        diseno_motivo: serverVariant.diseno_motivo,
        precio: serverProd.precio_base,
        cantidad: qty,
        stockMaximo: serverVariant.stock_disponible,
        imagen: serverProd.imagenes[0] || '',
      });
    }

    const subtotal = verifiedItems.reduce(
      (acc, it) => acc + it.precio * it.cantidad,
      0
    );

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
        body.referenceUrl ||
        `https://lasantastore.enigmaproducciones.com/pedido/${orderNum.replace('#', '')}`,
    };

    db.orders = [newOrder, ...db.orders];
    const saved = await writeDbAsync(db);

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
    const db = await readDbAsync();
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

    let createdNotification = null;
    if (
      (nextEstado === 'Despachado' || nextEstado === 'Entregado') &&
      existingOrder.estado !== nextEstado
    ) {
      createdNotification = createOrderStatusNotification(updatedOrder, nextEstado);
      db.notifications = [createdNotification, ...db.notifications];
    }

    const saved = await writeDbAsync(db);
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

    const db = await readDbAsync();
    const target = db.orders.find((o) => o.id === id);
    if (!target) {
      return NextResponse.json(
        { success: false, message: 'Registro no encontrado.' },
        { status: 404 }
      );
    }

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

    const saved = await writeDbAsync(db);
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
