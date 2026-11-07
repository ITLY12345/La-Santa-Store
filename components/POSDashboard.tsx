'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import {
  Producto,
  Variante,
  Order,
  CartItem,
  MetodoPagoInterno,
  EstadoPedido,
  formatCOP,
} from '@/lib/data';
import { DigitalInvoiceModal } from './DigitalInvoiceModal';
import {
  Receipt,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  Pencil,
  Truck,
  CheckCircle2,
  MapPin,
  FileText,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Clock,
  Printer,
  SlidersHorizontal,
} from 'lucide-react';

interface POSDashboardProps {
  onBackToStore?: () => void;
}

export function POSDashboard({ onBackToStore }: POSDashboardProps) {
  const {
    products,
    orders,
    createPosInvoice,
    updateOrderFull,
    deleteOrder,
    updateOrderStatus,
    storeConfig,
  } = useStore();

  // Active view within POS Dashboard: 'invoices' (history & control) | 'terminal' (new sale)
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'terminal'>('invoices');

  // Search & Filter state for Invoices
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<'Todos' | EstadoPedido>('Todos');
  const [posToastMsg, setPosToastMsg] = useState<string | null>(null);

  // Terminal Sale State (Building a new invoice)
  const [posCatalogSearch, setPosCatalogSearch] = useState('');
  const [posCatalogCategory, setPosCatalogCategory] = useState<
    'Todas' | 'Camisetas' | 'Bolsos' | 'Chanclas'
  >('Todas');
  const [posItems, setPosItems] = useState<CartItem[]>([]);
  const [posClienteNombre, setPosClienteNombre] = useState('');
  const [posClienteDoc, setPosClienteDoc] = useState('');
  const [posClienteTel, setPosClienteTel] = useState('');
  const [posClienteDir, setPosClienteDir] = useState('Cartagena de Indias, Colombia');
  const [posTransportadora, setPosTransportadora] = useState('');
  const [posGuia, setPosGuia] = useState('');
  const [posCostoEnvio, setPosCostoEnvio] = useState<number>(0);
  const [posDescuento, setPosDescuento] = useState<number>(0);
  const [posMetodoPago, setPosMetodoPago] = useState<MetodoPagoInterno>('Efectivo');
  const [posEstadoInicial, setPosEstadoInicial] = useState<EstadoPedido>('Facturado');
  const [posNotas, setPosNotas] = useState('');
  const [terminalFeedback, setTerminalFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Edit / Modify Invoice Modal State
  const [editingInvoice, setEditingInvoice] = useState<Order | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDoc, setEditDoc] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editDir, setEditDir] = useState('');
  const [editTransportadora, setEditTransportadora] = useState('');
  const [editGuia, setEditGuia] = useState('');
  const [editItems, setEditItems] = useState<CartItem[]>([]);
  const [editEnvio, setEditEnvio] = useState<number>(0);
  const [editDescuento, setEditDescuento] = useState<number>(0);
  const [editMetodoPago, setEditMetodoPago] = useState<MetodoPagoInterno>('Transferencia / Nequi');
  const [editEstado, setEditEstado] = useState<EstadoPedido>('Facturado');
  const [editNotas, setEditNotas] = useState('');
  const [editAddProductId, setEditAddProductId] = useState<string>('');
  const [editAddVariantId, setEditAddVariantId] = useState<string>('');
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Delete Invoice Confirmation Modal State
  const [invoiceToDelete, setInvoiceToDelete] = useState<Order | null>(null);

  // Digital Invoice PDF/Print View
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  const showToast = (msg: string) => {
    setPosToastMsg(msg);
    setTimeout(() => setPosToastMsg(null), 4000);
  };

  // Filtered products for visual POS catalog
  const filteredCatalog = useMemo(() => {
    return products.filter((p) => {
      if (posCatalogCategory !== 'Todas' && p.categoria !== posCatalogCategory) return false;
      if (posCatalogSearch.trim()) {
        const q = posCatalogSearch.toLowerCase().trim();
        return (
          p.nombre.toLowerCase().includes(q) ||
          (p.referencia && p.referencia.toLowerCase().includes(q)) ||
          p.marca_motivo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, posCatalogCategory, posCatalogSearch]);

  // Terminal Line Add
  const handleAddVariantToPosTicket = (prod: Producto, variant: Variante) => {
    setTerminalFeedback(null);
    if (variant.stock_disponible <= 0) {
      setTerminalFeedback({
        type: 'error',
        text: `La talla ${variant.talla} de ${prod.nombre} está agotada en inventario.`,
      });
      return;
    }

    const existingIdx = posItems.findIndex(
      (it) => it.productoId === prod.id && it.varianteId === variant.id_variante
    );

    if (existingIdx > -1) {
      const existing = posItems[existingIdx];
      if (existing.cantidad + 1 > variant.stock_disponible) {
        setTerminalFeedback({
          type: 'error',
          text: `Stock máximo disponible para ${prod.nombre} (${variant.talla}): ${variant.stock_disponible} un.`,
        });
        return;
      }
      const updated = [...posItems];
      updated[existingIdx] = { ...existing, cantidad: existing.cantidad + 1 };
      setPosItems(updated);
    } else {
      const newItem: CartItem = {
        cartItemId: `pos_line_${prod.id}_${variant.id_variante}`,
        productoId: prod.id,
        varianteId: variant.id_variante,
        nombre: prod.nombre,
        categoria: prod.categoria,
        marca_motivo: prod.marca_motivo,
        talla: variant.talla,
        color: variant.color,
        diseno_motivo: variant.diseno_motivo,
        precio: prod.precio_base,
        cantidad: 1,
        stockMaximo: variant.stock_disponible,
        imagen:
          prod.imagenes[0] ||
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85',
      };
      setPosItems([...posItems, newItem]);
    }
  };

  const handleUpdatePosLineQty = (cartItemId: string, delta: number) => {
    setTerminalFeedback(null);
    setPosItems((prev) =>
      prev
        .map((it) => {
          if (it.cartItemId !== cartItemId) return it;
          const nextQty = it.cantidad + delta;
          if (nextQty <= 0) return null;
          if (nextQty > it.stockMaximo) {
            setTerminalFeedback({
              type: 'error',
              text: `Stock máximo alcanzado (${it.stockMaximo} un.)`,
            });
            return it;
          }
          return { ...it, cantidad: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const posSubtotal = useMemo(() => {
    return posItems.reduce((sum, it) => sum + it.precio * it.cantidad, 0);
  }, [posItems]);

  const posGrandTotal = useMemo(() => {
    return Math.max(0, posSubtotal + (Number(posCostoEnvio) || 0) - (Number(posDescuento) || 0));
  }, [posSubtotal, posCostoEnvio, posDescuento]);

  // Emit New POS Invoice
  const handleEmitPosInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setTerminalFeedback(null);

    if (posItems.length === 0) {
      setTerminalFeedback({
        type: 'error',
        text: 'Agrega al menos una prenda al ticket antes de facturar.',
      });
      return;
    }

    const res = createPosInvoice({
      clienteNombre: posClienteNombre || 'Cliente Mostrador Cartagena',
      clienteDocumento: posClienteDoc || '222222222222',
      clienteTelefono: posClienteTel,
      clienteDireccion: posClienteDir || 'Punto de Venta Cartagena de Indias',
      transportadora: posTransportadora,
      guiaSeguimiento: posGuia,
      items: posItems,
      costoEnvio: Number(posCostoEnvio) || 0,
      descuentoManual: Number(posDescuento) || 0,
      metodoPagoInterno: posMetodoPago,
      estado: posEstadoInicial,
      notas: posNotas,
    });

    if (!res.success || !res.order) {
      setTerminalFeedback({
        type: 'error',
        text: res.message || 'No se pudo generar la factura POS.',
      });
      return;
    }

    setPosItems([]);
    setPosClienteNombre('');
    setPosClienteDoc('');
    setPosClienteTel('');
    setPosClienteDir('Cartagena de Indias, Colombia');
    setPosTransportadora('');
    setPosGuia('');
    setPosCostoEnvio(0);
    setPosDescuento(0);
    setPosNotas('');
    setActiveSubTab('invoices');
    setSelectedOrderForInvoice(res.order);
    showToast(`Factura oficial ${res.order.invoiceNumber} creada exitosamente.`);
  };

  // Open Edit Invoice Modal
  const openEditModal = (ord: Order) => {
    setEditingInvoice(ord);
    setEditNombre(ord.clienteNombre);
    setEditDoc(ord.clienteDocumento || '');
    setEditTel(ord.clienteTelefono || '');
    setEditDir(ord.clienteDireccion);
    setEditTransportadora(ord.transportadora || '');
    setEditGuia(ord.guiaSeguimiento || '');
    setEditItems(structuredClone(ord.items));
    setEditEnvio(ord.costoEnvio || 0);
    setEditDescuento(ord.descuentoManual || 0);
    setEditMetodoPago(
      ord.metodoPagoInterno === 'Por definir' ? 'Transferencia / Nequi' : ord.metodoPagoInterno
    );
    setEditEstado(ord.estado === 'Pendiente' ? 'Facturado' : ord.estado);
    setEditNotas(ord.notas || '');
    const firstProd = products[0];
    setEditAddProductId(firstProd?.id || '');
    setEditAddVariantId(firstProd?.variantes[0]?.id_variante || '');
    setEditModalError(null);
  };

  const handleAddLineToEditInvoice = () => {
    setEditModalError(null);
    const prod = products.find((p) => p.id === editAddProductId);
    const variant = prod?.variantes.find((v) => v.id_variante === editAddVariantId);
    if (!prod || !variant) return;

    const existingIdx = editItems.findIndex(
      (it) => it.productoId === prod.id && it.varianteId === variant.id_variante
    );

    if (existingIdx > -1) {
      const updated = [...editItems];
      updated[existingIdx] = {
        ...updated[existingIdx],
        cantidad: updated[existingIdx].cantidad + 1,
      };
      setEditItems(updated);
    } else {
      setEditItems([
        ...editItems,
        {
          cartItemId: `edit_line_${prod.id}_${variant.id_variante}`,
          productoId: prod.id,
          varianteId: variant.id_variante,
          nombre: prod.nombre,
          categoria: prod.categoria,
          marca_motivo: prod.marca_motivo,
          talla: variant.talla,
          color: variant.color,
          diseno_motivo: variant.diseno_motivo,
          precio: prod.precio_base,
          cantidad: 1,
          stockMaximo: variant.stock_disponible + 10,
          imagen:
            prod.imagenes[0] ||
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85',
        },
      ]);
    }
  };

  const handleSaveEditedInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setEditModalError(null);

    const res = updateOrderFull(editingInvoice.id, {
      clienteNombre: editNombre,
      clienteDocumento: editDoc,
      clienteTelefono: editTel,
      clienteDireccion: editDir,
      transportadora: editTransportadora,
      guiaSeguimiento: editGuia,
      items: editItems,
      costoEnvio: Number(editEnvio) || 0,
      descuentoManual: Number(editDescuento) || 0,
      metodoPagoInterno: editMetodoPago,
      estado: editEstado,
      notas: editNotas,
    });

    if (!res.success || !res.order) {
      setEditModalError(res.message || 'No se pudo actualizar la factura.');
      return;
    }

    setEditingInvoice(null);
    showToast(`Factura ${res.order.invoiceNumber || res.order.orderNumber} modificada correctamente.`);
  };

  const handleConfirmDeleteInvoice = () => {
    if (!invoiceToDelete) return;
    const isBilled = Boolean(invoiceToDelete.invoiceNumber);
    const label = invoiceToDelete.invoiceNumber || invoiceToDelete.orderNumber;
    deleteOrder(invoiceToDelete.id);
    setInvoiceToDelete(null);
    showToast(
      isBilled
        ? `Nota Crédito oficial emitida para ${label} y stock restituido al inventario.`
        : `Orden borrador ${label} eliminada correctamente.`
    );
  };

  // Filtered Invoices List
  const filteredInvoices = useMemo(() => {
    return orders.filter((ord) => {
      if (selectedEstadoFilter !== 'Todos' && ord.estado !== selectedEstadoFilter) return false;
      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase().trim();
        const mNum = ord.orderNumber.toLowerCase().includes(q);
        const mInv = ord.invoiceNumber?.toLowerCase().includes(q) ?? false;
        const mClient = ord.clienteNombre.toLowerCase().includes(q);
        const mDoc = ord.clienteDocumento?.toLowerCase().includes(q) ?? false;
        const mGuia = ord.guiaSeguimiento?.toLowerCase().includes(q) ?? false;
        if (!mNum && !mInv && !mClient && !mDoc && !mGuia) return false;
      }
      return true;
    });
  }, [orders, selectedEstadoFilter, invoiceSearch]);

  // Key Financial & Dispatch Metrics
  const metrics = useMemo(() => {
    const totalVentas = orders
      .filter((o) => o.estado !== 'Cancelado')
      .reduce((sum, o) => sum + o.total, 0);
    const facturadas = orders.filter(
      (o) => o.estado === 'Facturado' || o.estado === 'Despachado' || o.estado === 'Entregado'
    ).length;
    const despachadas = orders.filter((o) => o.estado === 'Despachado').length;
    const entregadas = orders.filter((o) => o.estado === 'Entregado').length;
    const pendientes = orders.filter((o) => o.estado === 'Pendiente').length;

    return { totalVentas, facturadas, despachadas, entregadas, pendientes };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {posToastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-[#111111] text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{posToastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F5F5F7] p-5 rounded-[28px]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Sistema POS & Control de Facturación Interna
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Terminal de Facturación y Ventas POS
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Sede Central: <strong>{storeConfig.storeCity}</strong> · Consecutivo Activo: FAC-{storeConfig.nextInvoiceSequence}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('invoices')}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'invoices'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'bg-white text-[#111111] hover:bg-zinc-200/80'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Facturas Emitidas ({orders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('terminal')}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'terminal'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'bg-white text-[#111111] hover:bg-zinc-200/80'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Venta POS</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#F5F5F7] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Total Facturado</span>
            <DollarSign className="w-4 h-4 text-[#111111]" />
          </div>
          <p className="text-base sm:text-lg font-black text-[#111111] tabular-nums">
            {formatCOP(metrics.totalVentas)}
          </p>
          <span className="text-[10px] text-zinc-500">Ventas confirmadas</span>
        </div>

        <div className="bg-[#F5F5F7] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Facturas</span>
            <FileText className="w-4 h-4 text-[#111111]" />
          </div>
          <p className="text-base sm:text-lg font-black text-[#111111] tabular-nums">
            {metrics.facturadas}
          </p>
          <span className="text-[10px] text-zinc-500">Con stock deducido</span>
        </div>

        <div className="bg-[#F5F5F7] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">En Despacho</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-amber-600 tabular-nums">
            {metrics.despachadas}
          </p>
          <span className="text-[10px] text-zinc-500">Con guía asignada</span>
        </div>

        <div className="bg-[#F5F5F7] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Entregados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
            {metrics.entregadas}
          </p>
          <span className="text-[10px] text-zinc-500">Ventas finalizadas</span>
        </div>

        <div className="bg-[#F5F5F7] p-4 rounded-2xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Por Confirmar</span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-base sm:text-lg font-black text-[#111111] tabular-nums">
            {metrics.pendientes}
          </p>
          <span className="text-[10px] text-zinc-500">Pedidos de WhatsApp</span>
        </div>
      </div>

      {/* VIEW 1: FACTURAS EMITIDAS & CONTROL DE DESPACHOS */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#F5F5F7] p-3.5 rounded-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Buscar por factura (FAC-1001), cliente, cédula o guía..."
                className="w-full bg-white rounded-full pl-9 pr-4 py-2 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#111111]"
              />
              {invoiceSearch && (
                <button
                  type="button"
                  onClick={() => setInvoiceSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#111111]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['Todos', 'Facturado', 'Despachado', 'Entregado', 'Pendiente', 'Cancelado'] as const).map(
                (st) => {
                  const isSelected = selectedEstadoFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedEstadoFilter(st)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
                        isSelected
                          ? 'bg-[#111111] text-white'
                          : 'bg-white text-zinc-600 hover:text-[#111111]'
                      }`}
                    >
                      {st}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Invoices Table */}
          {filteredInvoices.length === 0 ? (
            <div className="py-16 text-center bg-[#F5F5F7] rounded-3xl p-6 space-y-3">
              <Receipt className="w-10 h-10 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-[#111111]">
                No hay facturas con los filtros seleccionados
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Crea una nueva factura desde la terminal POS o limpia los términos de búsqueda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setInvoiceSearch('');
                  setSelectedEstadoFilter('Todos');
                }}
                className="px-5 py-2 rounded-full bg-[#111111] text-white text-xs font-bold"
              >
                Ver Todas las Facturas
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map((inv) => {
                const totalItemsCount = inv.items.reduce((s, it) => s + it.cantidad, 0);
                return (
                  <div
                    key={inv.id}
                    className="bg-[#F5F5F7] rounded-3xl p-4 sm:p-5 transition hover:shadow-xs border border-transparent hover:border-zinc-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/70">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center font-mono font-black text-xs text-[#111111] shadow-2xs">
                          {inv.invoiceNumber ? inv.invoiceNumber.replace('FAC-', '') : 'ORD'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#111111]">
                              {inv.invoiceNumber || inv.orderNumber}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.estado === 'Facturado'
                                  ? 'bg-blue-100 text-blue-800'
                                  : inv.estado === 'Despachado'
                                  ? 'bg-amber-100 text-amber-800'
                                  : inv.estado === 'Entregado'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.estado === 'Cancelado'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-zinc-200 text-zinc-700'
                              }`}
                            >
                              {inv.estado}
                            </span>
                            {inv.creditNoteNumber && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-600 text-white">
                                {inv.creditNoteNumber}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-zinc-500 bg-white px-2 py-0.5 rounded-full">
                              {inv.origen}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {inv.fecha} · Cliente: <strong>{inv.clienteNombre}</strong>
                            {inv.clienteDocumento ? ` (CC/NIT: ${inv.clienteDocumento})` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 block font-medium">Total Factura</span>
                          <span className="text-base font-black text-[#111111] tabular-nums">
                            {formatCOP(inv.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Products Breakdown + Dispatch Details */}
                    <div className="py-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Products preview */}
                      <div className="md:col-span-2 space-y-1.5">
                        <span className="text-[11px] font-bold text-zinc-400 block">
                          Productos Facturados ({totalItemsCount} unidades):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {inv.items.map((it) => (
                            <span
                              key={it.cartItemId}
                              className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl text-[11px] font-semibold text-[#111111]"
                            >
                              <span className="font-bold">{it.cantidad}x</span>
                              <span className="truncate max-w-[140px]">{it.nombre}</span>
                              <span className="text-zinc-400 text-[10px]">
                                ({it.talla} / {it.color})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Dispatch & Carrier */}
                      <div className="bg-white/80 p-3 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500 font-medium">Envío:</span>
                          <span className="font-bold text-[#111111]">
                            {inv.costoEnvio > 0 ? formatCOP(inv.costoEnvio) : 'Local Cartagena'}
                          </span>
                        </div>
                        {inv.transportadora && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-500 font-medium">Transportadora:</span>
                            <span className="font-bold text-[#111111]">{inv.transportadora}</span>
                          </div>
                        )}
                        {inv.guiaSeguimiento && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-500 font-medium">Guía:</span>
                            <span className="font-mono font-bold text-[#111111]">
                              {inv.guiaSeguimiento}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500 font-medium">Pago:</span>
                          <span className="font-semibold text-[#111111]">{inv.metodoPagoInterno}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-zinc-200/70 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-400 font-medium">Cambiar Estado:</span>
                        {(['Facturado', 'Despachado', 'Entregado', 'Cancelado'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              updateOrderStatus(inv.id, st);
                              showToast(`Factura ${inv.invoiceNumber || inv.orderNumber} actualizada a "${st}".`);
                            }}
                            disabled={inv.estado === st}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                              inv.estado === st
                                ? 'bg-[#111111] text-white'
                                : 'bg-white text-zinc-600 hover:text-[#111111]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForInvoice(inv)}
                          className="px-3 py-1.5 rounded-full bg-white text-[#111111] font-bold text-xs flex items-center gap-1 hover:bg-zinc-200 transition"
                          title="Imprimir / Ver Comprobante Digital"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Comprobante</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(inv)}
                          className="px-3 py-1.5 rounded-full bg-white text-[#111111] font-bold text-xs flex items-center gap-1 hover:bg-zinc-200 transition"
                          title="Modificar Factura, Items y Datos"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Modificar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInvoiceToDelete(inv)}
                          className="w-8 h-8 rounded-full bg-white text-zinc-400 hover:text-red-600 flex items-center justify-center transition"
                          title="Eliminar / Anular Factura"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TERMINAL VISUAL DE FACTURACIÓN POS */}
      {activeSubTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Visual Product Catalog */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#F5F5F7] p-4 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111]">Catálogo de Prendas para Facturar</span>
                <span className="text-[11px] text-zinc-500">
                  {filteredCatalog.length} artículos disponibles
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={posCatalogSearch}
                    onChange={(e) => setPosCatalogSearch(e.target.value)}
                    placeholder="Buscar por nombre o referencia..."
                    className="w-full bg-white rounded-full pl-9 pr-3 py-2 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#111111]"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {(['Todas', 'Camisetas', 'Bolsos', 'Chanclas'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPosCatalogCategory(cat)}
                      className={`px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${
                        posCatalogCategory === cat
                          ? 'bg-[#111111] text-white'
                          : 'bg-white text-zinc-600 hover:text-[#111111]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredCatalog.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-[#F5F5F7] p-3 rounded-2xl flex flex-col justify-between space-y-2 border border-transparent hover:border-zinc-300 transition"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prod.imagenes[0]}
                      alt={prod.nombre}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-black/75 text-white px-2 py-0.5 rounded-full text-[9px] font-mono font-bold">
                      {prod.referencia || 'REF'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#111111] line-clamp-1">{prod.nombre}</h4>
                    <span className="text-xs font-black text-[#111111] tabular-nums">
                      {formatCOP(prod.precio_base)}
                    </span>
                  </div>

                  {/* Size buttons to instantly add variant to POS ticket */}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-200/80">
                    {prod.variantes.map((v) => {
                      const isOutOfStock = v.stock_disponible <= 0;
                      return (
                        <button
                          key={v.id_variante}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddVariantToPosTicket(prod, v)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed line-through'
                              : 'bg-white hover:bg-[#111111] hover:text-white text-[#111111] active:scale-95 shadow-2xs'
                          }`}
                          title={`${v.color} - Stock: ${v.stock_disponible}`}
                        >
                          <span>{v.talla}</span>
                          <span className="text-[9px] opacity-60">({v.stock_disponible})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: POS Cash Register Ticket */}
          <div className="lg:col-span-5 bg-[#F5F5F7] rounded-3xl p-5 space-y-4 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#111111]" />
                <h3 className="text-sm font-black text-[#111111]">Ticket de Venta POS</h3>
              </div>
              <span className="font-mono text-xs font-bold text-zinc-500">
                FAC-{storeConfig.nextInvoiceSequence}
              </span>
            </div>

            {terminalFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  terminalFeedback.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {terminalFeedback.text}
              </div>
            )}

            {/* Items in ticket */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {posItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Haz clic en las tallas de los productos para agregarlos al ticket de caja.
                </div>
              ) : (
                posItems.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="bg-white p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#111111] truncate">{item.nombre}</p>
                      <p className="text-[10px] text-zinc-500">
                        Talla: <strong>{item.talla}</strong> · {item.color} · {formatCOP(item.precio)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-[#F5F5F7] rounded-full px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdatePosLineQty(item.cartItemId, -1)}
                        className="w-5 h-5 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold text-xs tabular-nums">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdatePosLineQty(item.cartItemId, 1)}
                        className="w-5 h-5 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-xs font-black text-[#111111] tabular-nums shrink-0">
                      {formatCOP(item.precio * item.cantidad)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Client & Billing Options Form */}
            <form onSubmit={handleEmitPosInvoice} className="space-y-3 pt-2 border-t border-zinc-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    Nombre Cliente
                  </label>
                  <input
                    type="text"
                    value={posClienteNombre}
                    onChange={(e) => setPosClienteNombre(e.target.value)}
                    placeholder="Cliente Mostrador"
                    className="w-full bg-white rounded-xl px-3 py-2 text-xs text-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    Cédula / NIT
                  </label>
                  <input
                    type="text"
                    value={posClienteDoc}
                    onChange={(e) => setPosClienteDoc(e.target.value)}
                    placeholder="222222222222"
                    className="w-full bg-white rounded-xl px-3 py-2 text-xs font-mono text-[#111111]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={posClienteTel}
                    onChange={(e) => setPosClienteTel(e.target.value)}
                    placeholder="300 000 0000"
                    className="w-full bg-white rounded-xl px-3 py-2 text-xs text-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={posMetodoPago}
                    onChange={(e) => setPosMetodoPago(e.target.value as MetodoPagoInterno)}
                    className="w-full bg-white rounded-xl px-2.5 py-2 text-xs font-bold text-[#111111]"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia / Nequi">Transferencia / Nequi</option>
                    <option value="Tarjeta / Datáfono">Tarjeta / Datáfono</option>
                    <option value="Contraentrega">Contraentrega</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    Costo de Envío ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={posCostoEnvio}
                    onChange={(e) => setPosCostoEnvio(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    Descuento ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={posDescuento}
                    onChange={(e) => setPosDescuento(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-white p-3.5 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal prendas</span>
                  <span className="font-mono font-bold text-[#111111]">{formatCOP(posSubtotal)}</span>
                </div>
                {posCostoEnvio > 0 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Flete de envío</span>
                    <span className="font-mono font-bold text-[#111111]">+{formatCOP(posCostoEnvio)}</span>
                  </div>
                )}
                {posDescuento > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Descuento aplicado</span>
                    <span className="font-mono font-bold">-{formatCOP(posDescuento)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-200 pt-2 flex justify-between items-center text-sm font-black text-[#111111]">
                  <span>Total Facturado</span>
                  <span className="text-base tabular-nums">{formatCOP(posGrandTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={posItems.length === 0}
                className="w-full py-3.5 rounded-full bg-[#111111] text-white font-bold text-xs hover:bg-zinc-800 transition active:scale-[0.98] disabled:opacity-40"
              >
                Emitir Factura Oficial & Descargar Comprobante
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFICAR / EDITAR FACTURA EXISTENTE */}
      {editingInvoice && (
        <div
          onClick={() => setEditingInvoice(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-[32px] p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-black text-[#111111]">
                  Modificar Factura {editingInvoice.invoiceNumber || editingInvoice.orderNumber}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Ajusta líneas de productos, datos del cliente, guía de despacho o método de pago
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center"
              >
                <X className="w-4 h-4 text-[#111111]" />
              </button>
            </div>

            {editModalError && (
              <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-xs font-semibold">
                {editModalError}
              </div>
            )}

            <form onSubmit={handleSaveEditedInvoice} className="space-y-4 text-xs">
              {/* Client Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Cédula / NIT
                  </label>
                  <input
                    type="text"
                    value={editDoc}
                    onChange={(e) => setEditDoc(e.target.value)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editTel}
                    onChange={(e) => setEditTel(e.target.value)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                  Dirección de Entrega
                </label>
                <input
                  type="text"
                  value={editDir}
                  onChange={(e) => setEditDir(e.target.value)}
                  className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              {/* Dispatch carrier & Tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Transportadora / Mensajería
                  </label>
                  <input
                    type="text"
                    value={editTransportadora}
                    onChange={(e) => setEditTransportadora(e.target.value)}
                    placeholder="Ej. Coordinadora, Envía, Domicilio Local"
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Número de Guía de Rastreo
                  </label>
                  <input
                    type="text"
                    value={editGuia}
                    onChange={(e) => setEditGuia(e.target.value)}
                    placeholder="Ej. CTG-984210"
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 font-mono font-bold text-[#111111]"
                  />
                </div>
              </div>

              {/* Items Table within Invoice */}
              <div className="space-y-2">
                <span className="font-bold text-[#111111] block">
                  Líneas de Productos en la Factura
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-[#F5F5F7] p-3 rounded-2xl">
                  {editItems.map((item, idx) => (
                    <div
                      key={item.cartItemId}
                      className="bg-white p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#111111] truncate">{item.nombre}</p>
                        <p className="text-[10px] text-zinc-500">
                          Talla: <strong>{item.talla}</strong> · {item.color} · {formatCOP(item.precio)} c/u
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.cantidad > 1) {
                              const next = [...editItems];
                              next[idx] = { ...item, cantidad: item.cantidad - 1 };
                              setEditItems(next);
                            } else {
                              setEditItems(editItems.filter((_, i) => i !== idx));
                            }
                          }}
                          className="w-6 h-6 rounded-full bg-[#F5F5F7] flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...editItems];
                            next[idx] = { ...item, cantidad: item.cantidad + 1 };
                            setEditItems(next);
                          }}
                          className="w-6 h-6 rounded-full bg-[#F5F5F7] flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-bold font-mono tabular-nums text-xs">
                        {formatCOP(item.precio * item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add new line to invoice */}
                <div className="flex gap-2 items-center bg-[#F5F5F7] p-2.5 rounded-2xl">
                  <select
                    value={editAddProductId}
                    onChange={(e) => {
                      setEditAddProductId(e.target.value);
                      const p = products.find((x) => x.id === e.target.value);
                      if (p && p.variantes[0]) setEditAddVariantId(p.variantes[0].id_variante);
                    }}
                    className="bg-white rounded-xl px-2.5 py-1.5 text-xs font-bold flex-1"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({formatCOP(p.precio_base)})
                      </option>
                    ))}
                  </select>

                  <select
                    value={editAddVariantId}
                    onChange={(e) => setEditAddVariantId(e.target.value)}
                    className="bg-white rounded-xl px-2.5 py-1.5 text-xs font-bold"
                  >
                    {products
                      .find((p) => p.id === editAddProductId)
                      ?.variantes.map((v) => (
                        <option key={v.id_variante} value={v.id_variante}>
                          Talla {v.talla} ({v.color}) - Stock: {v.stock_disponible}
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddLineToEditInvoice}
                    className="px-3 py-1.5 rounded-xl bg-[#111111] text-white font-bold text-xs"
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {/* Status and Financial Values */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Estado Factura
                  </label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value as EstadoPedido)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 font-bold"
                  >
                    <option value="Facturado">Facturado</option>
                    <option value="Despachado">Despachado</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={editMetodoPago}
                    onChange={(e) => setEditMetodoPago(e.target.value as MetodoPagoInterno)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-2 py-2 font-bold"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia / Nequi">Transferencia / Nequi</option>
                    <option value="Tarjeta / Datáfono">Tarjeta / Datáfono</option>
                    <option value="Contraentrega">Contraentrega</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Costo de Envío ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editEnvio}
                    onChange={(e) => setEditEnvio(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Descuento ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editDescuento}
                    onChange={(e) => setEditDescuento(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="w-1/3 py-3 rounded-full bg-[#F5F5F7] text-xs font-bold text-[#111111]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800"
                >
                  Guardar Cambios & Reconciliar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN DE FACTURA */}
      {invoiceToDelete && (
        <div
          onClick={() => setInvoiceToDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 text-left space-y-4 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">
                {invoiceToDelete.invoiceNumber
                  ? `¿Emitir Nota Crédito para ${invoiceToDelete.invoiceNumber}?`
                  : `¿Eliminar borrador ${invoiceToDelete.orderNumber}?`}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {invoiceToDelete.invoiceNumber
                  ? 'Por normativa contable (DIAN / Odoo ERP), las facturas en firme no se borran físicamente: se emitirá una Nota Crédito oficial (NC-XXXX), pasará a estado Cancelado y se devolverá el stock a bodega.'
                  : 'Este pedido en borrador aún no tiene factura fiscal emitida y será retirado del listado.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="flex-1 py-3 rounded-full bg-[#F5F5F7] font-bold text-xs text-[#111111]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInvoice}
                className="flex-1 py-3 rounded-full bg-red-600 text-white font-bold text-xs hover:bg-red-700"
              >
                {invoiceToDelete.invoiceNumber ? 'Emitir Nota Crédito' : 'Eliminar Borrador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPROBANTE DIGITAL / IMPRESIÓN */}
      {selectedOrderForInvoice && (
        <DigitalInvoiceModal
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}
    </div>
  );
}
