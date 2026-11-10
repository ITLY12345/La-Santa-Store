import { NextRequest, NextResponse } from 'next/server';
import {
  readDbAsync,
  writeDbAsync,
  getFormattedNow,
  isStockCommittedState,
  reconcileStockItems,
  createOrderStatusNotification,
} from '@/lib/server-db';
import {
  Order,
  formatCOP,
  EstadoPedido,
  CartItem,
  calculateTaxBreakdown,
} from '@/lib/data';
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

      // Validate quantities and prices: positive numbers only
      for (const it of items) {
        const qty = Number(it.cantidad);
        if (!Number.isInteger(qty) || qty <= 0 || qty > 99) {
          return NextResponse.json(
            { success: false, message: 'Las cantidades deben ser números enteros positivos mayores a cero.' },
            { status: 400 }
          );
        }
        const price = Number(it.precio);
        if (typeof it.precio !== 'number' || isNaN(price) || price < 0) {
          return NextResponse.json(
            { success: false, message: 'Los precios unitarios no pueden ser negativos ni inválidos.' },
            { status: 400 }
          );
        }
      }

      const estadoInicial: EstadoPedido = body.estado || 'Facturado';
      const shouldDeduct = isStockCommittedState(estadoInicial);
      const nextSeq = db.storeConfig.nextInvoiceSequence || 1003;
      const prefix = db.storeConfig.prefijoFactura || 'FAC';
      const invoiceNum = `${prefix}-${nextSeq}`;
      const orderNum = `#POS-${nextSeq}`;

      const modalidadVenta: Order['modalidadVenta'] =
        body.modalidadVenta || 'Detal';
      const ubicacionDespacho: Order['ubicacionDespacho'] =
        body.ubicacionDespacho || 'Bodega Principal';

      const stockResult = reconcileStockItems(
        db.products,
        [],
        false,
        items,
        shouldDeduct,
        {
          documentoRef: invoiceNum,
          motivoSalida:
            modalidadVenta === 'Consignación'
              ? `Despacho en Consignación ${invoiceNum}`
              : `Venta POS (${modalidadVenta}) Factura ${invoiceNum}`,
          ubicacionDespacho,
          modalidadVenta,
        }
      );
      if (!stockResult.success) {
        return NextResponse.json(
          { success: false, message: stockResult.errorMessage },
          { status: 400 }
        );
      }

      const subtotal = items.reduce(
        (acc: number, it: { precio: number; cantidad: number }) => acc + it.precio * it.cantidad,
        0
      );
      const envio = Math.max(0, Number(body.costoEnvio) || 0);
      const descuento = Math.max(0, Number(body.descuentoManual) || 0);
      const total = Math.max(0, subtotal + envio - descuento);
      const tax = calculateTaxBreakdown(Math.max(0, subtotal - descuento), 19);

      const isCreditOrConsig =
        modalidadVenta === 'Crédito' || modalidadVenta === 'Consignación';
      const montoAbonado =
        body.montoAbonado !== undefined
          ? Math.min(total, Math.max(0, Number(body.montoAbonado) || 0))
          : isCreditOrConsig
          ? 0
          : total;
      const saldoPendiente = Math.max(0, total - montoAbonado);

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
        modalidadVenta,
        ubicacionDespacho,
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
        baseGravable: tax.baseGravable,
        impuestoIva: tax.impuestoIva,
        ivaPorcentaje: tax.ivaPorcentaje,
        costoEnvio: envio,
        descuentoManual: descuento,
        envioTexto: envio > 0 ? formatCOP(envio) : 'Sin costo / Local Cartagena',
        total,
        montoAbonado,
        saldoPendiente,
        fechaVencimiento:
          typeof body.fechaVencimiento === 'string' && body.fechaVencimiento.trim()
            ? body.fechaVencimiento.trim().slice(0, 40)
            : undefined,
        estado: estadoInicial,
        metodoPagoInterno: body.metodoPagoInterno || 'Efectivo',
        stockDeducted: shouldDeduct,
        notas: typeof body.notas === 'string' ? body.notas.slice(0, 500) : '',
        referenceUrl: `https://lasantastore.enigmaproducciones.com/factura/${invoiceNum}`,
      };

      db.products = stockResult.products;
      if (stockResult.generatedMoves.length > 0) {
        db.stockMoves = [
          ...stockResult.generatedMoves,
          ...(db.stockMoves || []),
        ].slice(0, 500);
      }
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
        stockMoves: saved.stockMoves,
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

    const clientName = typeof body.clienteNombre === 'string' ? body.clienteNombre.trim() : '';
    const rawPhone = typeof body.clienteTelefono === 'string' ? body.clienteTelefono.trim() : '';
    const cleanPhoneDigits = rawPhone.replace(/\D/g, '');
    const shippingOpt: 'recoger' | 'nacional' | 'cartagena' | 'local' = body.envioOpcion || 'local';
    const clientAddress = typeof body.clienteDireccion === 'string' ? body.clienteDireccion.trim() : '';

    if (clientName.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Por favor ingresa tu nombre y apellido (mínimo 3 caracteres).' },
        { status: 400 }
      );
    }

    if (cleanPhoneDigits.length < 7) {
      return NextResponse.json(
        { success: false, message: 'Por favor ingresa un número de WhatsApp o celular válido (mínimo 7 dígitos).' },
        { status: 400 }
      );
    }

    if (shippingOpt !== 'recoger' && clientAddress.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Por favor ingresa la dirección de entrega exacta (mínimo 6 caracteres).' },
        { status: 400 }
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
      if (serverVariant.stock_disponible < qty) {
        return NextResponse.json(
          {
            success: false,
            message: `Stock insuficiente para ${serverProd.nombre} (Talla ${serverVariant.talla} · ${serverVariant.color}). Disponible: ${serverVariant.stock_disponible} un.`,
          },
          { status: 400 }
        );
      }

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
    const whatsappTax = calculateTaxBreakdown(subtotal, 19);

    // Compute shipping strictly based on server configuration
    let safeShipping = 0;
    let shippingLabel = 'Recoger en Punto de Venta';
    if (shippingOpt === 'nacional') {
      safeShipping = Math.max(0, db.storeConfig.tarifaEnvioNacional ?? 16000);
      shippingLabel = 'Envío Nacional Asegurado';
    } else if (shippingOpt === 'recoger') {
      safeShipping = 0;
      shippingLabel = 'Recoger en Punto de Venta';
    } else {
      const freeThreshold = db.storeConfig.envioGratisDesde ?? 200000;
      const isFree = subtotal >= freeThreshold;
      safeShipping = isFree ? 0 : Math.max(0, db.storeConfig.tarifaEnvioCartagena ?? 8000);
      shippingLabel = isFree
        ? `Envío Local (Gratis por compra >= ${formatCOP(freeThreshold)})`
        : 'Envío Local';
    }

    // Server-authoritative sequential order numbering
    const nextOrderSeq = (db.storeConfig.nextOrderSequence || 1000) + 1;
    db.storeConfig.nextOrderSequence = nextOrderSeq;
    const orderNum = `#ORD-${nextOrderSeq}`;
    const orderId = `ord-${Date.now()}-${nextOrderSeq}`;

    const appBaseUrl = process.env.APP_URL || 'https://lasantastore.enigmaproducciones.com';
    const referenceUrl = `${appBaseUrl.replace(/\/$/, '')}/?pedido=${orderNum.replace('#', '')}`;

    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum,
      fecha: formattedDate,
      origen: 'WhatsApp',
      clienteNombre: clientName,
      clienteDocumento: (body.clienteDocumento || '').trim().slice(0, 40),
      clienteDireccion:
        shippingOpt === 'recoger'
          ? clientAddress || 'Recoger en Punto de Venta'
          : clientAddress,
      clienteTelefono: rawPhone,
      items: verifiedItems,
      subtotal,
      baseGravable: whatsappTax.baseGravable,
      impuestoIva: whatsappTax.impuestoIva,
      ivaPorcentaje: whatsappTax.ivaPorcentaje,
      costoEnvio: safeShipping,
      descuentoManual: 0,
      envioTexto: shippingLabel,
      total: subtotal + safeShipping,
      estado: 'Pendiente',
      metodoPagoInterno: 'Por definir',
      stockDeducted: false,
      notas: typeof body.notas === 'string' ? body.notas.slice(0, 500) : '',
      referenceUrl,
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

    // Preserve invoice immutability: Line items of an issued invoice cannot be retroactively altered
    if (
      existingOrder.invoiceNumber &&
      existingOrder.estado !== 'Cancelado' &&
      body.items &&
      JSON.stringify(body.items) !== JSON.stringify(existingOrder.items)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `La factura oficial ${existingOrder.invoiceNumber} ya fue emitida y sus productos no pueden ser modificados. Para registrar devoluciones o cambios, anula la factura con Nota Crédito o ajusta el estado de entrega.`,
        },
        { status: 400 }
      );
    }

    const nextEstado: EstadoPedido = body.estado || existingOrder.estado;
    const nextItems = Array.isArray(body.items) ? body.items : existingOrder.items;

    if (nextItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'La factura debe contener al menos un producto.' },
        { status: 400 }
      );
    }

    const shouldDeductNext = isStockCommittedState(nextEstado);
    const nextSeq = db.storeConfig.nextInvoiceSequence || 1003;
    const prefix = db.storeConfig.prefijoFactura || 'FAC';
    const docRef =
      existingOrder.invoiceNumber ||
      (shouldDeductNext ? `${prefix}-${nextSeq}` : existingOrder.orderNumber);

    const nextModalidad: Order['modalidadVenta'] =
      body.modalidadVenta || existingOrder.modalidadVenta || 'Detal';
    const nextUbicacion: Order['ubicacionDespacho'] =
      body.ubicacionDespacho || existingOrder.ubicacionDespacho || 'Bodega Principal';

    const stockRes = reconcileStockItems(
      db.products,
      existingOrder.items,
      existingOrder.stockDeducted,
      nextItems,
      shouldDeductNext,
      {
        orderId: existingOrder.id,
        documentoRef: docRef,
        motivoSalida: `Facturación de orden ${existingOrder.orderNumber} (${docRef})`,
        motivoReintegro: `Reversión de inventario sobre ${docRef}`,
        ubicacionDespacho: nextUbicacion,
        modalidadVenta: nextModalidad,
      }
    );

    if (!stockRes.success) {
      return NextResponse.json(
        { success: false, message: stockRes.errorMessage },
        { status: 400 }
      );
    }

    let assignedInvoice = existingOrder.invoiceNumber;
    let assignedCreditNote = existingOrder.creditNoteNumber;
    let fechaFacturacion = existingOrder.fechaFacturacion;
    let fechaDespacho = existingOrder.fechaDespacho;
    let fechaEntrega = existingOrder.fechaEntrega;
    let fechaNotaCredito = existingOrder.fechaNotaCredito;
    let motivoNotaCredito = existingOrder.motivoNotaCredito;

    if (shouldDeductNext && !assignedInvoice) {
      assignedInvoice = `${prefix}-${nextSeq}`;
      fechaFacturacion = formattedDate;
      db.storeConfig.nextInvoiceSequence = nextSeq + 1;
    }

    // If an already-billed invoice is cancelled, automatically emit an official Credit Note (NC-XXXX)
    if (nextEstado === 'Cancelado' && assignedInvoice && !assignedCreditNote) {
      const nextNcSeq = db.storeConfig.nextCreditNoteSequence || 1001;
      assignedCreditNote = `NC-${nextNcSeq}`;
      fechaNotaCredito = formattedDate;
      motivoNotaCredito = 'Anulación contable de factura con reversión de inventario';
      db.storeConfig.nextCreditNoteSequence = nextNcSeq + 1;
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
    const editTax = calculateTaxBreakdown(Math.max(0, subtotal - descuento), 19);

    const isCreditOrConsig =
      nextModalidad === 'Crédito' || nextModalidad === 'Consignación';
    const nextMontoAbonado =
      body.montoAbonado !== undefined
        ? Math.min(total, Math.max(0, Number(body.montoAbonado) || 0))
        : existingOrder.montoAbonado !== undefined
        ? Math.min(total, existingOrder.montoAbonado)
        : isCreditOrConsig
        ? 0
        : total;
    const nextSaldoPendiente = Math.max(0, total - nextMontoAbonado);

    const updatedOrder: Order = {
      ...existingOrder,
      invoiceNumber: assignedInvoice,
      creditNoteNumber: assignedCreditNote,
      fechaFacturacion,
      fechaDespacho,
      fechaEntrega,
      fechaNotaCredito,
      motivoNotaCredito,
      modalidadVenta: nextModalidad,
      ubicacionDespacho: nextUbicacion,
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
      baseGravable: editTax.baseGravable,
      impuestoIva: editTax.impuestoIva,
      ivaPorcentaje: editTax.ivaPorcentaje,
      costoEnvio: envio,
      descuentoManual: descuento,
      envioTexto:
        envio > 0
          ? formatCOP(envio)
          : shouldDeductNext
          ? 'Gratis / Local Cartagena'
          : existingOrder.envioTexto,
      total,
      montoAbonado: nextMontoAbonado,
      saldoPendiente: nextSaldoPendiente,
      fechaVencimiento:
        body.fechaVencimiento !== undefined
          ? body.fechaVencimiento.trim() || undefined
          : existingOrder.fechaVencimiento,
      estado: nextEstado,
      metodoPagoInterno: body.metodoPagoInterno || existingOrder.metodoPagoInterno,
      stockDeducted: shouldDeductNext,
      notas: body.notas !== undefined ? body.notas : existingOrder.notas,
    };

    db.products = stockRes.products;
    if (stockRes.generatedMoves.length > 0) {
      db.stockMoves = [
        ...stockRes.generatedMoves,
        ...(db.stockMoves || []),
      ].slice(0, 500);
    }
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
      stockMoves: saved.stockMoves,
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

    const nextNcSeq = db.storeConfig.nextCreditNoteSequence || 1001;
    const creditNoteNumber = target.invoiceNumber
      ? target.creditNoteNumber || `NC-${nextNcSeq}`
      : undefined;

    if (target.stockDeducted) {
      const stockRes = reconcileStockItems(
        db.products,
        target.items,
        true,
        [],
        false,
        {
          orderId: target.id,
          documentoRef:
            creditNoteNumber || target.invoiceNumber || target.orderNumber,
          motivoReintegro: `Devolución a inventario por Nota Crédito ${
            creditNoteNumber || target.invoiceNumber
          }`,
        }
      );
      db.products = stockRes.products;
      if (stockRes.generatedMoves.length > 0) {
        db.stockMoves = [
          ...stockRes.generatedMoves,
          ...(db.stockMoves || []),
        ].slice(0, 500);
      }
    }

    // Estándar ERP / DIAN: Las facturas emitidas (con FAC-XXXX) son inmutables y se anulan mediante Nota Crédito (NC-XXXX)
    if (target.invoiceNumber && creditNoteNumber) {
      if (!target.creditNoteNumber) {
        db.storeConfig.nextCreditNoteSequence = nextNcSeq + 1;
      }

      db.orders = db.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              estado: 'Cancelado',
              stockDeducted: false,
              creditNoteNumber,
              fechaNotaCredito: getFormattedNow(),
              motivoNotaCredito: 'Anulación contable mediante Nota Crédito con retorno a inventario',
            }
          : o
      );
    } else {
      // Solo pedidos en borrador (Pendientes sin factura emitida) se eliminan físicamente
      db.orders = db.orders.filter((o) => o.id !== id);
      db.notifications = db.notifications.filter((n) => n.orderId !== id);
    }

    const saved = await writeDbAsync(db);
    return NextResponse.json({
      success: true,
      products: saved.products,
      orders: saved.orders,
      stockMoves: saved.stockMoves,
      storeConfig: sanitizePublicStoreConfig(saved.storeConfig),
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
