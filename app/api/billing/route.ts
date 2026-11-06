import { NextRequest, NextResponse } from 'next/server';
import {
  readDb,
  writeDb,
  getFormattedNow,
  isStockCommittedState,
  reconcileStockItems,
  createOrderStatusNotification,
} from '@/lib/server-db';
import { Order, formatCOP, EstadoPedido } from '@/lib/data';

/**
 * GET /api/billing
 * List all invoices, billing records, summary metrics and internal dispatch statuses
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');
    const search = searchParams.get('search')?.toLowerCase().trim();

    const db = readDb();
    let invoices = db.orders;

    if (estado && estado !== 'Todos') {
      invoices = invoices.filter((inv) => inv.estado === estado);
    }

    if (search) {
      invoices = invoices.filter((inv) => {
        const matchesNum = inv.orderNumber.toLowerCase().includes(search);
        const matchesFac = inv.invoiceNumber?.toLowerCase().includes(search) ?? false;
        const matchesCliente = inv.clienteNombre.toLowerCase().includes(search);
        const matchesDoc = inv.clienteDocumento?.toLowerCase().includes(search) ?? false;
        const matchesGuia = inv.guiaSeguimiento?.toLowerCase().includes(search) ?? false;
        return matchesNum || matchesFac || matchesCliente || matchesDoc || matchesGuia;
      });
    }

    // Key financial metrics for internal POS billing control
    const totalVentas = db.orders
      .filter((o) => o.estado !== 'Cancelado')
      .reduce((sum, o) => sum + o.total, 0);

    const facturasEmitidas = db.orders.filter(
      (o) => o.estado === 'Facturado' || o.estado === 'Despachado' || o.estado === 'Entregado'
    ).length;

    const pedidosDespachados = db.orders.filter((o) => o.estado === 'Despachado').length;
    const pedidosEntregados = db.orders.filter((o) => o.estado === 'Entregado').length;
    const pedidosPendientes = db.orders.filter((o) => o.estado === 'Pendiente').length;

    return NextResponse.json({
      success: true,
      invoices,
      metricas: {
        totalVentas,
        facturasEmitidas,
        pedidosPendientes,
        pedidosDespachados,
        pedidosEntregados,
        totalRegistros: db.orders.length,
      },
    });
  } catch (err) {
    console.error('GET /api/billing error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al consultar las facturas de ventas.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing
 * Create a new official POS invoice with stock reconciliation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();
    const formattedDate = getFormattedNow();

    const items = body.items || [];
    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'La factura POS debe incluir al menos un producto.' },
        { status: 400 }
      );
    }

    const estadoInicial: EstadoPedido = body.estado || 'Facturado';
    const shouldDeduct = isStockCommittedState(estadoInicial);

    // Reconcile and deduct product stock
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

    const newInvoice: Order = {
      id: `pos-${Date.now()}`,
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
    db.orders = [newInvoice, ...db.orders];
    db.storeConfig.nextInvoiceSequence = nextSeq + 1;

    // Internal status notification for dispatch tracking
    if (estadoInicial === 'Despachado' || estadoInicial === 'Entregado') {
      const notif = createOrderStatusNotification(newInvoice, estadoInicial);
      db.notifications = [notif, ...db.notifications];
    }

    const saved = writeDb(db);
    return NextResponse.json({
      success: true,
      invoice: newInvoice,
      products: saved.products,
      invoices: saved.orders,
      storeConfig: saved.storeConfig,
    });
  } catch (err) {
    console.error('POST /api/billing error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al emitir la factura POS.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/billing
 * Modify an existing invoice (items, quantities, client info, dispatch carrier/tracking, discount)
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();
    const invoiceId = body.id || body.orderId;

    const targetIdx = db.orders.findIndex((o) => o.id === invoiceId);
    if (targetIdx === -1) {
      return NextResponse.json(
        { success: false, message: 'Factura no encontrada para modificación.' },
        { status: 404 }
      );
    }

    const existingInvoice = db.orders[targetIdx];
    const formattedDate = getFormattedNow();

    const nextEstado: EstadoPedido = body.estado || existingInvoice.estado;
    const nextItems = Array.isArray(body.items) ? body.items : existingInvoice.items;

    if (nextItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'La factura debe tener al menos una línea de producto.' },
        { status: 400 }
      );
    }

    const shouldDeductNext = isStockCommittedState(nextEstado);

    // Reconcile inventory changes
    const stockRes = reconcileStockItems(
      db.products,
      existingInvoice.items,
      existingInvoice.stockDeducted,
      nextItems,
      shouldDeductNext
    );

    if (!stockRes.success) {
      return NextResponse.json(
        { success: false, message: stockRes.errorMessage },
        { status: 400 }
      );
    }

    let assignedInvoice = existingInvoice.invoiceNumber;
    let fechaFacturacion = existingInvoice.fechaFacturacion;
    let fechaDespacho = existingInvoice.fechaDespacho;
    let fechaEntrega = existingInvoice.fechaEntrega;
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
        : existingInvoice.costoEnvio;
    const descuento =
      body.descuentoManual !== undefined
        ? Math.max(0, Number(body.descuentoManual) || 0)
        : existingInvoice.descuentoManual || 0;
    const total = Math.max(0, subtotal + envio - descuento);

    const updatedInvoice: Order = {
      ...existingInvoice,
      invoiceNumber: assignedInvoice,
      fechaFacturacion,
      fechaDespacho,
      fechaEntrega,
      clienteNombre:
        body.clienteNombre !== undefined
          ? body.clienteNombre.trim() || existingInvoice.clienteNombre
          : existingInvoice.clienteNombre,
      clienteDocumento:
        body.clienteDocumento !== undefined
          ? body.clienteDocumento.trim()
          : existingInvoice.clienteDocumento,
      clienteTelefono:
        body.clienteTelefono !== undefined
          ? body.clienteTelefono.trim()
          : existingInvoice.clienteTelefono,
      clienteDireccion:
        body.clienteDireccion !== undefined
          ? body.clienteDireccion.trim() || existingInvoice.clienteDireccion
          : existingInvoice.clienteDireccion,
      transportadora:
        body.transportadora !== undefined
          ? body.transportadora.trim()
          : existingInvoice.transportadora,
      guiaSeguimiento:
        body.guiaSeguimiento !== undefined
          ? body.guiaSeguimiento.trim()
          : existingInvoice.guiaSeguimiento,
      items: nextItems,
      subtotal,
      costoEnvio: envio,
      descuentoManual: descuento,
      envioTexto:
        envio > 0
          ? formatCOP(envio)
          : shouldDeductNext
          ? 'Sin costo / Local Cartagena'
          : existingInvoice.envioTexto,
      total,
      estado: nextEstado,
      metodoPagoInterno: body.metodoPagoInterno || existingInvoice.metodoPagoInterno,
      stockDeducted: shouldDeductNext,
      notas: body.notas !== undefined ? body.notas : existingInvoice.notas,
    };

    db.products = stockRes.products;
    db.orders[targetIdx] = updatedInvoice;

    if (
      (nextEstado === 'Despachado' || nextEstado === 'Entregado') &&
      existingInvoice.estado !== nextEstado
    ) {
      const notif = createOrderStatusNotification(updatedInvoice, nextEstado);
      db.notifications = [notif, ...db.notifications];
    }

    const saved = writeDb(db);
    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      invoices: saved.orders,
      products: saved.products,
    });
  } catch (err) {
    console.error('PUT /api/billing error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al modificar la factura.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/billing
 * Delete or void an invoice, automatically restoring deducted inventory items
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID de factura requerido.' },
        { status: 400 }
      );
    }

    const db = readDb();
    const target = db.orders.find((o) => o.id === id);
    if (!target) {
      return NextResponse.json(
        { success: false, message: 'Factura no encontrada para anular o eliminar.' },
        { status: 404 }
      );
    }

    // Restore stock back to products if stock was committed
    if (target.stockDeducted) {
      const stockRes = reconcileStockItems(db.products, target.items, true, [], false);
      db.products = stockRes.products;
    }

    db.orders = db.orders.filter((o) => o.id !== id);
    db.notifications = db.notifications.filter((n) => n.orderId !== id);

    const saved = writeDb(db);
    return NextResponse.json({
      success: true,
      message: `Factura ${target.invoiceNumber || target.orderNumber} eliminada y stock restituido.`,
      invoices: saved.orders,
      products: saved.products,
    });
  } catch (err) {
    console.error('DELETE /api/billing error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al eliminar la factura.' },
      { status: 500 }
    );
  }
}
