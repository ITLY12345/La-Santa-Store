'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import {
  Producto,
  Variante,
  Order,
  CartItem,
  MetodoPagoInterno,
  ModalidadVentaPOS,
  EstadoPedido,
  formatCOP,
  formatThousandsInput,
  parseNumericInput,
} from '@/lib/data';
import { DigitalInvoiceModal } from './DigitalInvoiceModal';
import {
  Receipt,
  Plus,
  Trash2,
  Search,
  X,
  Pencil,
  Truck,
  CheckCircle2,
  FileText,
  DollarSign,
  AlertTriangle,
  ShoppingBag,
  Clock,
  Printer,
  ArrowLeftRight,
  Warehouse,
  CreditCard,
} from 'lucide-react';

interface POSDashboardProps {
  onBackToStore?: () => void;
}

export function POSDashboard({}: POSDashboardProps) {
  const {
    products,
    orders,
    stockMoves,
    createPosInvoice,
    updateOrderFull,
    registerOrderPayment,
    transferWarehouseStock,
    deleteOrder,
    updateOrderStatus,
    storeConfig,
  } = useStore();

  // Active view within POS Dashboard: 'invoices' | 'terminal' | 'transfers'
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'terminal' | 'transfers'>(
    'invoices'
  );

  // Search & Filter state for Invoices
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<'Todos' | EstadoPedido>('Todos');
  const [selectedModalidadFilter, setSelectedModalidadFilter] = useState<
    'Todas' | ModalidadVentaPOS | 'Cartera Pendiente'
  >('Todas');
  const [posToastMsg, setPosToastMsg] = useState<string | null>(null);

  // Terminal Sale State (Building a new invoice)
  const [posCatalogSearch, setPosCatalogSearch] = useState('');
  const [posCatalogCategory, setPosCatalogCategory] = useState<
    'Todas' | 'Camisetas' | 'Bolsos' | 'Chanclas'
  >('Todas');
  const [posModalidad, setPosModalidad] = useState<ModalidadVentaPOS>('Detal');
  const [posUbicacionDespacho, setPosUbicacionDespacho] = useState<
    'Bodega Principal' | 'Punto de Venta POS'
  >('Bodega Principal');
  const [posItems, setPosItems] = useState<CartItem[]>([]);
  const [posClienteNombre, setPosClienteNombre] = useState('');
  const [posClienteDoc, setPosClienteDoc] = useState('');
  const [posClienteTel, setPosClienteTel] = useState('');
  const [posClienteDir, setPosClienteDir] = useState('');
  const [posTransportadora, setPosTransportadora] = useState('');
  const [posGuia, setPosGuia] = useState('');
  const [posCostoEnvio, setPosCostoEnvio] = useState<number>(0);
  const [posDescuento, setPosDescuento] = useState<number>(0);
  const [posMontoAbonado, setPosMontoAbonado] = useState<number>(0);
  const [posFechaVencimiento, setPosFechaVencimiento] = useState('');
  const [posMetodoPago, setPosMetodoPago] = useState<MetodoPagoInterno>('Efectivo');
  const [posEstadoInicial, setPosEstadoInicial] = useState<EstadoPedido>('Facturado');
  const [posNotas, setPosNotas] = useState('');
  const [terminalFeedback, setTerminalFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Warehouse Transfers State (Traslados de Bodega & Consignación)
  const [transferTipo, setTransferTipo] = useState<
    'BODEGA_A_POS' | 'POS_A_BODEGA' | 'SALIDA_CONSIGNACION' | 'RETORNO_CONSIGNACION'
  >('BODEGA_A_POS');
  const [transferProdId, setTransferProdId] = useState<string>('');
  const [transferVarId, setTransferVarId] = useState<string>('');
  const [transferCantidad, setTransferCantidad] = useState<number>(1);
  const [transferPrecioPactado, setTransferPrecioPactado] = useState<number>(0);
  const [transferDestino, setTransferDestino] = useState<string>('Punto de Venta Principal');
  const [transferNotas, setTransferNotas] = useState<string>('');
  const [transferFeedback, setTransferFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Quick Abono / Cartera Payment Modal State
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [abonoInputAmount, setAbonoInputAmount] = useState<number>(0);
  const [abonoMetodoPago, setAbonoMetodoPago] = useState<MetodoPagoInterno>('Transferencia / Nequi');

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
  const [editModalidad, setEditModalidad] = useState<ModalidadVentaPOS>('Detal');
  const [editUbicacion, setEditUbicacion] = useState<'Bodega Principal' | 'Punto de Venta POS'>(
    'Bodega Principal'
  );
  const [editMontoAbonado, setEditMontoAbonado] = useState<number>(0);
  const [editFechaVencimiento, setEditFechaVencimiento] = useState('');
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

  // Helper to get default unit price for a product according to selected POS modality
  const getDefaultUnitPriceForModality = (prod: Producto, modalidad: ModalidadVentaPOS): number => {
    if (modalidad === 'Mayorista' || modalidad === 'Consignación') {
      if (prod.precio_mayorista && prod.precio_mayorista > 0) {
        return prod.precio_mayorista;
      }
    }
    return prod.precio_base;
  };

  // Switch modality in POS Terminal and update default payment method / item prices
  const handleSelectPosModalidad = (nextMod: ModalidadVentaPOS) => {
    setPosModalidad(nextMod);
    if (nextMod === 'Crédito') {
      setPosMetodoPago('Crédito / Plazo');
    } else if (nextMod === 'Consignación') {
      setPosMetodoPago('Consignación');
    } else if (
      posMetodoPago === 'Crédito / Plazo' ||
      posMetodoPago === 'Consignación'
    ) {
      setPosMetodoPago('Efectivo');
    }

    // Update existing ticket items to wholesale/retail default price when toggling Detal vs Mayorista
    setPosItems((prev) =>
      prev.map((it) => {
        const prod = products.find((p) => p.id === it.productoId);
        if (!prod) return it;
        return {
          ...it,
          precio: getDefaultUnitPriceForModality(prod, nextMod),
        };
      })
    );
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
    const totalSellable = (variant.stock_disponible || 0) + (variant.stock_punto_venta || 0);
    if (totalSellable <= 0) {
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
      if (existing.cantidad + 1 > totalSellable) {
        setTerminalFeedback({
          type: 'error',
          text: `Stock máximo disponible para ${prod.nombre} (${variant.talla}): ${totalSellable} un.`,
        });
        return;
      }
      const updated = [...posItems];
      updated[existingIdx] = {
        ...existing,
        cantidad: existing.cantidad + 1,
        stockMaximo: totalSellable,
      };
      setPosItems(updated);
    } else {
      const unitPrice = getDefaultUnitPriceForModality(prod, posModalidad);
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
        precio: unitPrice,
        cantidad: 1,
        stockMaximo: totalSellable,
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

  const handleUpdatePosLinePrice = (cartItemId: string, newPrice: number) => {
    setPosItems((prev) =>
      prev.map((it) => (it.cartItemId === cartItemId ? { ...it, precio: newPrice } : it))
    );
  };

  const posSubtotal = useMemo(() => {
    return posItems.reduce((sum, it) => sum + it.precio * it.cantidad, 0);
  }, [posItems]);

  const posGrandTotal = useMemo(() => {
    return Math.max(0, posSubtotal + (Number(posCostoEnvio) || 0) - (Number(posDescuento) || 0));
  }, [posSubtotal, posCostoEnvio, posDescuento]);

  const posIsCreditOrConsig = posModalidad === 'Crédito' || posModalidad === 'Consignación';
  const posSaldoPendiente = posIsCreditOrConsig
    ? Math.max(0, posGrandTotal - Math.min(posGrandTotal, posMontoAbonado))
    : 0;

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

    const effectiveAbono = posIsCreditOrConsig
      ? Math.min(posGrandTotal, Math.max(0, posMontoAbonado))
      : posGrandTotal;

    const res = createPosInvoice({
      clienteNombre:
        posClienteNombre ||
        (posModalidad === 'Consignación'
          ? 'Aliado / Punto en Consignación'
          : 'Cliente Mostrador'),
      clienteDocumento: posClienteDoc || '222222222222',
      clienteTelefono: posClienteTel,
      clienteDireccion: posClienteDir || storeConfig.storeAddress || 'Punto de Venta Principal',
      transportadora: posTransportadora,
      guiaSeguimiento: posGuia,
      items: posItems,
      costoEnvio: Number(posCostoEnvio) || 0,
      descuentoManual: Number(posDescuento) || 0,
      metodoPagoInterno: posMetodoPago,
      modalidadVenta: posModalidad,
      ubicacionDespacho: posUbicacionDespacho,
      montoAbonado: effectiveAbono,
      fechaVencimiento: posIsCreditOrConsig ? posFechaVencimiento : undefined,
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
    setPosClienteDir('');
    setPosTransportadora('');
    setPosGuia('');
    setPosCostoEnvio(0);
    setPosDescuento(0);
    setPosMontoAbonado(0);
    setPosFechaVencimiento('');
    setPosNotas('');
    setActiveSubTab('invoices');
    setSelectedOrderForInvoice(res.order);
    showToast(
      `Factura oficial ${res.order.invoiceNumber} (${posModalidad}) creada exitosamente.`
    );
  };

  // Warehouse Transfer Execution
  const activeTransferProduct = useMemo(() => {
    return products.find((p) => p.id === (transferProdId || products[0]?.id));
  }, [products, transferProdId]);

  const activeTransferVariant = useMemo(() => {
    if (!activeTransferProduct) return undefined;
    return (
      activeTransferProduct.variantes.find((v) => v.id_variante === transferVarId) ||
      activeTransferProduct.variantes[0]
    );
  }, [activeTransferProduct, transferVarId]);

  const handleExecuteWarehouseTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferFeedback(null);

    if (!activeTransferProduct || !activeTransferVariant) {
      setTransferFeedback({
        type: 'error',
        text: 'Selecciona un producto y variante válidos para el traslado.',
      });
      return;
    }

    if (transferCantidad <= 0) {
      setTransferFeedback({
        type: 'error',
        text: 'Ingresa una cantidad mayor a 0 unidades.',
      });
      return;
    }

    const res = await transferWarehouseStock({
      productoId: activeTransferProduct.id,
      varianteId: activeTransferVariant.id_variante,
      tipo: transferTipo,
      cantidad: transferCantidad,
      destinoNombre: transferDestino.trim() || undefined,
      precioUnitarioPactado:
        transferPrecioPactado > 0 ? transferPrecioPactado : undefined,
      notas: transferNotas.trim() || undefined,
    });

    if (!res.success) {
      setTransferFeedback({
        type: 'error',
        text: res.message || 'No se pudo completar el traslado.',
      });
      return;
    }

    setTransferFeedback({
      type: 'success',
      text: `Traslado registrado correctamente: ${transferCantidad} un. de ${activeTransferProduct.nombre} (${activeTransferVariant.talla}).`,
    });
    showToast(
      `Traslado de bodega exitoso (${transferCantidad} un. · ${activeTransferProduct.nombre}).`
    );
    setTransferNotas('');
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
    const mod = ord.modalidadVenta || 'Detal';
    setEditModalidad(mod);
    setEditUbicacion(ord.ubicacionDespacho || 'Bodega Principal');
    setEditMontoAbonado(
      ord.montoAbonado !== undefined
        ? ord.montoAbonado
        : mod === 'Crédito' || mod === 'Consignación'
        ? 0
        : ord.total
    );
    setEditFechaVencimiento(ord.fechaVencimiento || '');
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
          precio: getDefaultUnitPriceForModality(prod, editModalidad),
          cantidad: 1,
          stockMaximo: (variant.stock_disponible || 0) + (variant.stock_punto_venta || 0) + 10,
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

    const editSub = editItems.reduce((s, it) => s + it.precio * it.cantidad, 0);
    const editTotal = Math.max(0, editSub + (Number(editEnvio) || 0) - (Number(editDescuento) || 0));
    const isCred = editModalidad === 'Crédito' || editModalidad === 'Consignación';
    const effectiveAbono = isCred ? Math.min(editTotal, editMontoAbonado) : editTotal;

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
      modalidadVenta: editModalidad,
      ubicacionDespacho: editUbicacion,
      montoAbonado: effectiveAbono,
      fechaVencimiento: isCred ? editFechaVencimiento : undefined,
      estado: editEstado,
      notas: editNotas,
    });

    if (!res.success || !res.order) {
      setEditModalError(res.message || 'No se pudo actualizar la factura.');
      return;
    }

    setEditingInvoice(null);
    showToast(
      `Factura ${res.order.invoiceNumber || res.order.orderNumber} modificada correctamente.`
    );
  };

  const handleConfirmRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOrder) return;
    const res = registerOrderPayment(paymentOrder.id, abonoInputAmount, abonoMetodoPago);
    if (!res.success) {
      showToast(res.message || 'No se pudo registrar el abono.');
      return;
    }
    const label = paymentOrder.invoiceNumber || paymentOrder.orderNumber;
    setPaymentOrder(null);
    setAbonoInputAmount(0);
    showToast(`Abono por ${formatCOP(abonoInputAmount)} aplicado a ${label}.`);
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
      if (selectedModalidadFilter === 'Cartera Pendiente') {
        const pending =
          ord.saldoPendiente !== undefined
            ? ord.saldoPendiente
            : ord.modalidadVenta === 'Crédito' || ord.modalidadVenta === 'Consignación'
            ? Math.max(0, ord.total - (ord.montoAbonado || 0))
            : 0;
        if (pending <= 0 || ord.estado === 'Cancelado') return false;
      } else if (selectedModalidadFilter !== 'Todas') {
        const ordMod = ord.modalidadVenta || 'Detal';
        if (ordMod !== selectedModalidadFilter) return false;
      }
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
  }, [orders, selectedEstadoFilter, selectedModalidadFilter, invoiceSearch]);

  // Key Financial, Warehouse & Dispatch Metrics
  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.estado !== 'Cancelado');
    const totalVentas = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const carteraPendiente = activeOrders.reduce((sum, o) => {
      const pending =
        o.saldoPendiente !== undefined
          ? o.saldoPendiente
          : o.modalidadVenta === 'Crédito' || o.modalidadVenta === 'Consignación'
          ? Math.max(0, o.total - (o.montoAbonado || 0))
          : 0;
      return sum + pending;
    }, 0);

    let stockBodega = 0;
    let stockPos = 0;
    let stockConsig = 0;
    products.forEach((p) => {
      p.variantes.forEach((v) => {
        stockBodega += v.stock_disponible || 0;
        stockPos += v.stock_punto_venta || 0;
        stockConsig += v.stock_consignacion || 0;
      });
    });

    const facturadas = orders.filter(
      (o) => o.estado === 'Facturado' || o.estado === 'Despachado' || o.estado === 'Entregado'
    ).length;

    return {
      totalVentas,
      carteraPendiente,
      stockBodega,
      stockPos,
      stockConsig,
      facturadas,
    };
  }, [orders, products]);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#F5F5F7] p-5 rounded-[28px]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Sistema POS · Control de Bodega, Mayor, Detal, Crédito y Consignación
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Terminal POS, Cartera &amp; Traslados de Bodega
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Consecutivo Activo: <strong>FAC-{storeConfig.nextInvoiceSequence}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <span>Facturas &amp; Cartera ({orders.length})</span>
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
          <button
            type="button"
            onClick={() => setActiveSubTab('transfers')}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'transfers'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'bg-white text-[#111111] hover:bg-zinc-200/80'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Traslados de Bodega &amp; Consignación</span>
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
          <span className="text-[10px] text-zinc-500">
            {metrics.facturadas} facturas emitidas
          </span>
        </div>

        <div className="bg-[#F5F5F7] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Cartera / Crédito</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-amber-600 tabular-nums">
            {formatCOP(metrics.carteraPendiente)}
          </p>
          <span className="text-[10px] text-zinc-500">Saldo por cobrar</span>
        </div>

        <div className="bg-[#F5F5F7] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Bodega Principal</span>
            <Warehouse className="w-4 h-4 text-[#111111]" />
          </div>
          <p className="text-base sm:text-lg font-black text-[#111111] tabular-nums">
            {metrics.stockBodega} un.
          </p>
          <span className="text-[10px] text-zinc-500">Stock en bodega central</span>
        </div>

        <div className="bg-[#F5F5F7] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Punto de Venta</span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
            {metrics.stockPos} un.
          </p>
          <span className="text-[10px] text-zinc-500">Mercancía en local POS</span>
        </div>

        <div className="bg-[#F5F5F7] p-4 rounded-2xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase">En Consignación</span>
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-blue-600 tabular-nums">
            {metrics.stockConsig} un.
          </p>
          <span className="text-[10px] text-zinc-500">Despachado en consignación</span>
        </div>
      </div>

      {/* VIEW 1: FACTURAS EMITIDAS, CARTERA A CRÉDITO & CONSIGNACIÓN */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#F5F5F7] p-3.5 rounded-2xl space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                {(
                  [
                    'Todos',
                    'Facturado',
                    'Despachado',
                    'Entregado',
                    'Pendiente',
                    'Cancelado',
                  ] as const
                ).map((st) => {
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
                })}
              </div>
            </div>

            {/* Modality & Cartera Filter Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-zinc-200/70 scrollbar-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1">
                Modalidad:
              </span>
              {(
                [
                  'Todas',
                  'Detal',
                  'Mayorista',
                  'Crédito',
                  'Consignación',
                  'Cartera Pendiente',
                ] as const
              ).map((mod) => {
                const isSelected = selectedModalidadFilter === mod;
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setSelectedModalidadFilter(mod)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
                      isSelected
                        ? 'bg-[#111111] text-white'
                        : 'bg-white text-zinc-600 hover:text-[#111111]'
                    }`}
                  >
                    {mod === 'Detal'
                      ? 'Al Detal'
                      : mod === 'Mayorista'
                      ? 'Al Mayor'
                      : mod}
                  </button>
                );
              })}
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
                  setSelectedModalidadFilter('Todas');
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
                const modalidad = inv.modalidadVenta || 'Detal';
                const saldoPendiente =
                  inv.saldoPendiente !== undefined
                    ? inv.saldoPendiente
                    : modalidad === 'Crédito' || modalidad === 'Consignación'
                    ? Math.max(0, inv.total - (inv.montoAbonado || 0))
                    : 0;
                const montoAbonado =
                  inv.montoAbonado !== undefined
                    ? inv.montoAbonado
                    : inv.total - saldoPendiente;

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
                          <div className="flex flex-wrap items-center gap-1.5">
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
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                modalidad === 'Mayorista'
                                  ? 'bg-purple-100 text-purple-800'
                                  : modalidad === 'Crédito'
                                  ? 'bg-amber-100 text-amber-900'
                                  : modalidad === 'Consignación'
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-white text-[#111111]'
                              }`}
                            >
                              {modalidad === 'Detal'
                                ? 'Al Detal'
                                : modalidad === 'Mayorista'
                                ? 'Al Mayor'
                                : modalidad}
                            </span>
                            {inv.ubicacionDespacho && (
                              <span className="text-[10px] font-semibold text-zinc-500 bg-white px-2 py-0.5 rounded-full">
                                {inv.ubicacionDespacho}
                              </span>
                            )}
                            {inv.creditNoteNumber && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-600 text-white">
                                {inv.creditNoteNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {inv.fecha} · Cliente: <strong>{inv.clienteNombre}</strong>
                            {inv.clienteDocumento ? ` (CC/NIT: ${inv.clienteDocumento})` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        {saldoPendiente > 0 && inv.estado !== 'Cancelado' && (
                          <div className="text-right bg-amber-50 border border-amber-200 px-3 py-1 rounded-2xl">
                            <span className="text-[9px] uppercase font-extrabold text-amber-700 block">
                              Saldo Pendiente
                            </span>
                            <span className="text-xs font-black text-amber-900 tabular-nums">
                              {formatCOP(saldoPendiente)}
                            </span>
                          </div>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 block font-medium">
                            Total Factura
                          </span>
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
                                ({it.talla} / {it.color} · {formatCOP(it.precio)})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Dispatch, Payment & Cartera */}
                      <div className="bg-white/80 p-3 rounded-2xl space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500 font-medium">Pago:</span>
                          <span className="font-semibold text-[#111111]">
                            {inv.metodoPagoInterno}
                          </span>
                        </div>
                        {(modalidad === 'Crédito' ||
                          modalidad === 'Consignación' ||
                          saldoPendiente > 0) && (
                          <>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-500 font-medium">Abonado:</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {formatCOP(montoAbonado)}
                              </span>
                            </div>
                            {inv.fechaVencimiento && (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-zinc-500 font-medium">Vencimiento:</span>
                                <span className="font-mono font-semibold text-[#111111]">
                                  {inv.fechaVencimiento}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500 font-medium">Envío:</span>
                          <span className="font-bold text-[#111111]">
                            {inv.costoEnvio > 0 ? formatCOP(inv.costoEnvio) : 'Envío Local / Tienda'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-zinc-200/70 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-400 font-medium">
                          Cambiar Estado:
                        </span>
                        {(['Facturado', 'Despachado', 'Entregado', 'Cancelado'] as const).map(
                          (st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                updateOrderStatus(inv.id, st);
                                showToast(
                                  `Factura ${inv.invoiceNumber || inv.orderNumber} actualizada a "${st}".`
                                );
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
                          )
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {saldoPendiente > 0 && inv.estado !== 'Cancelado' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentOrder(inv);
                              setAbonoInputAmount(saldoPendiente);
                            }}
                            className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Registrar Abono</span>
                          </button>
                        )}

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
                          title="Modificar Factura, Precios, Items y Datos"
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

      {/* VIEW 2: TERMINAL VISUAL DE FACTURACIÓN POS (DETAL, MAYOR, CRÉDITO, CONSIGNACIÓN) */}
      {activeSubTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Visual Product Catalog */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#F5F5F7] p-4 rounded-3xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[#111111] block">
                    Catálogo de Prendas para Facturar ({posModalidad})
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Haz clic en la talla para agregar al ticket. Puedes editar el precio unitario de salida en el ticket.
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#111111] bg-white px-3 py-1 rounded-full">
                  {filteredCatalog.length} referencias
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredCatalog.map((prod) => {
                const activePrice = getDefaultUnitPriceForModality(prod, posModalidad);
                return (
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
                      <h4 className="text-xs font-bold text-[#111111] line-clamp-1">
                        {prod.nombre}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-[#111111] tabular-nums">
                          {formatCOP(activePrice)}
                        </span>
                        {prod.precio_mayorista && prod.precio_mayorista > 0 && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            (Mayor: {formatCOP(prod.precio_mayorista)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Size buttons to instantly add variant to POS ticket */}
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-200/80">
                      {prod.variantes.map((v) => {
                        const sellable =
                          (v.stock_disponible || 0) + (v.stock_punto_venta || 0);
                        const isOutOfStock = sellable <= 0;
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
                            title={`${v.color} · Bodega: ${v.stock_disponible} | POS: ${
                              v.stock_punto_venta || 0
                            }`}
                          >
                            <span>{v.talla}</span>
                            <span className="text-[9px] opacity-60">({sellable})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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

            {/* Selector de Modalidad de Venta (Detal, Mayorista, Crédito, Consignación) */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 block">
                Modalidad de Operación &amp; Precio de Salida
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['Detal', 'Mayorista', 'Crédito', 'Consignación'] as const).map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => handleSelectPosModalidad(mod)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition ${
                      posModalidad === mod
                        ? 'bg-[#111111] text-white shadow-xs'
                        : 'bg-white text-zinc-600 hover:text-[#111111]'
                    }`}
                  >
                    {mod === 'Detal' ? 'Al Detal' : mod === 'Mayorista' ? 'Al Mayor' : mod}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 text-xs">
                <span className="text-[11px] font-bold text-zinc-500">Salida desde:</span>
                <div className="flex items-center gap-1">
                  {(['Bodega Principal', 'Punto de Venta POS'] as const).map((ub) => (
                    <button
                      key={ub}
                      type="button"
                      onClick={() => setPosUbicacionDespacho(ub)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        posUbicacionDespacho === ub
                          ? 'bg-[#111111] text-white'
                          : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
                      }`}
                    >
                      {ub}
                    </button>
                  ))}
                </div>
              </div>
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

            {/* Items in ticket with Editable Unit Price (Formatted as 80.000) */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {posItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Haz clic en las tallas de los productos para agregarlos al ticket de caja.
                </div>
              ) : (
                posItems.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="bg-white p-2.5 rounded-xl space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#111111] truncate">
                          {item.nombre}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          Talla: <strong>{item.talla}</strong> · {item.color}
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
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-400">
                          Precio u. ($):
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={formatThousandsInput(item.precio, true)}
                          onChange={(e) =>
                            handleUpdatePosLinePrice(
                              item.cartItemId,
                              parseNumericInput(e.target.value)
                            )
                          }
                          className="w-24 bg-[#F5F5F7] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#111111] tabular-nums"
                        />
                      </div>

                      <span className="text-xs font-black text-[#111111] tabular-nums">
                        {formatCOP(item.precio * item.cantidad)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Client & Billing Options Form */}
            <form
              onSubmit={handleEmitPosInvoice}
              className="space-y-3 pt-2 border-t border-zinc-200"
            >
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    {posModalidad === 'Consignación'
                      ? 'Cliente / Punto Consignatario'
                      : 'Nombre Cliente'}
                  </label>
                  <input
                    type="text"
                    value={posClienteNombre}
                    onChange={(e) => setPosClienteNombre(e.target.value)}
                    placeholder={
                      posModalidad === 'Consignación'
                        ? 'Nombre del aliado o local'
                        : 'Cliente Mostrador'
                    }
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
                    <option value="Crédito / Plazo">Crédito / Plazo</option>
                    <option value="Consignación">Consignación</option>
                    <option value="Contraentrega">Contraentrega</option>
                  </select>
                </div>
              </div>

              {/* Costo de Envío y Descuento con Formato de Miles (80.000) y sin salto a cero */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    Costo de Envío ($)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatThousandsInput(posCostoEnvio, true)}
                    onChange={(e) => setPosCostoEnvio(parseNumericInput(e.target.value))}
                    className="w-full bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#111111] tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                    Descuento ($)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatThousandsInput(posDescuento, true)}
                    onChange={(e) => setPosDescuento(parseNumericInput(e.target.value))}
                    className="w-full bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#111111] tabular-nums"
                  />
                </div>
              </div>

              {/* Control de Cartera cuando es Venta a Crédito o En Consignación */}
              {posIsCreditOrConsig && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                      Control de Cartera ({posModalidad})
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-800">
                      Saldo: {formatCOP(posSaldoPendiente)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-amber-900 block mb-1">
                        Abono Inicial ($)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatThousandsInput(posMontoAbonado, true)}
                        onChange={(e) => setPosMontoAbonado(parseNumericInput(e.target.value))}
                        className="w-full bg-white rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[#111111] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-900 block mb-1">
                        Fecha Vencimiento / Corte
                      </label>
                      <input
                        type="date"
                        value={posFechaVencimiento}
                        onChange={(e) => setPosFechaVencimiento(e.target.value)}
                        className="w-full bg-white rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#111111]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Totals */}
              <div className="bg-white p-3.5 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal ({posModalidad})</span>
                  <span className="font-mono font-bold text-[#111111]">
                    {formatCOP(posSubtotal)}
                  </span>
                </div>
                {posCostoEnvio > 0 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Flete de envío</span>
                    <span className="font-mono font-bold text-[#111111]">
                      +{formatCOP(posCostoEnvio)}
                    </span>
                  </div>
                )}
                {posDescuento > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Descuento aplicado</span>
                    <span className="font-mono font-bold">-{formatCOP(posDescuento)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-200 pt-2 flex justify-between items-center text-sm font-black text-[#111111]">
                  <span>Total Operación</span>
                  <span className="text-base tabular-nums">{formatCOP(posGrandTotal)}</span>
                </div>
                {posIsCreditOrConsig && (
                  <div className="flex justify-between items-center text-xs font-bold text-amber-700 pt-1">
                    <span>Saldo Pendiente por Cobrar</span>
                    <span className="font-mono tabular-nums">
                      {formatCOP(posSaldoPendiente)}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={posItems.length === 0}
                className="w-full py-3.5 rounded-full bg-[#111111] text-white font-bold text-xs hover:bg-zinc-800 transition active:scale-[0.98] disabled:opacity-40"
              >
                Emitir Factura Oficial ({posModalidad}) &amp; Descargar Comprobante
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 3: TRASLADOS DE BODEGA, PUNTO DE VENTA & CONSIGNACIÓN */}
      {activeSubTab === 'transfers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Formulario de Traslado de Bodega */}
          <form
            onSubmit={handleExecuteWarehouseTransfer}
            className="lg:col-span-5 bg-[#F5F5F7] rounded-3xl p-5 space-y-4"
          >
            <div className="border-b border-zinc-200 pb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                Logística Interna &amp; Consignación
              </span>
              <h3 className="text-base font-black text-[#111111]">
                Registrar Traslado de Mercancía
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Mueve mercancía desde la Bodega Principal hacia el Punto de Venta o en Consignación con trazabilidad en Kardex.
              </p>
            </div>

            {transferFeedback && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold ${
                  transferFeedback.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {transferFeedback.text}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Tipo de Movimiento / Traslado
                </label>
                <select
                  value={transferTipo}
                  onChange={(e) =>
                    setTransferTipo(
                      e.target.value as
                        | 'BODEGA_A_POS'
                        | 'POS_A_BODEGA'
                        | 'SALIDA_CONSIGNACION'
                        | 'RETORNO_CONSIGNACION'
                    )
                  }
                  className="w-full bg-white rounded-xl px-3 py-2.5 font-bold text-[#111111]"
                >
                  <option value="BODEGA_A_POS">
                    Bodega Principal → Punto de Venta (POS)
                  </option>
                  <option value="POS_A_BODEGA">
                    Punto de Venta (POS) → Bodega Principal
                  </option>
                  <option value="SALIDA_CONSIGNACION">
                    Salida en Consignación (Bodega → Cliente / Aliado)
                  </option>
                  <option value="RETORNO_CONSIGNACION">
                    Retorno de Consignación → Bodega Principal
                  </option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Producto a Trasladar
                </label>
                <select
                  value={activeTransferProduct?.id || ''}
                  onChange={(e) => {
                    const nextProd = products.find((p) => p.id === e.target.value);
                    setTransferProdId(e.target.value);
                    if (nextProd && nextProd.variantes[0]) {
                      setTransferVarId(nextProd.variantes[0].id_variante);
                      setTransferPrecioPactado(
                        nextProd.precio_mayorista || nextProd.precio_base
                      );
                    }
                  }}
                  className="w-full bg-white rounded-xl px-3 py-2.5 font-bold text-[#111111]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.referencia ? `${p.referencia} · ` : ''}
                      {p.nombre} (PVP: {formatCOP(p.precio_base)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Variante (Talla / Color)
                </label>
                <select
                  value={activeTransferVariant?.id_variante || ''}
                  onChange={(e) => setTransferVarId(e.target.value)}
                  className="w-full bg-white rounded-xl px-3 py-2.5 font-bold text-[#111111]"
                >
                  {activeTransferProduct?.variantes.map((v) => (
                    <option key={v.id_variante} value={v.id_variante}>
                      Talla {v.talla} ({v.color}) — Bodega: {v.stock_disponible} un. | POS:{' '}
                      {v.stock_punto_venta || 0} un. | Consig: {v.stock_consignacion || 0} un.
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    Cantidad de Unidades
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1"
                    value={transferCantidad === 0 ? '' : String(transferCantidad)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setTransferCantidad(raw === '' ? 0 : Math.min(999, Number(raw)));
                    }}
                    className="w-full bg-white rounded-xl px-3 py-2 font-mono font-bold text-[#111111] tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    Precio Unitario Salida ($ COP)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej. 75.000"
                    value={formatThousandsInput(transferPrecioPactado, true)}
                    onChange={(e) =>
                      setTransferPrecioPactado(parseNumericInput(e.target.value))
                    }
                    className="w-full bg-white rounded-xl px-3 py-2 font-mono font-bold text-[#111111] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Punto de Venta / Responsable / Aliado en Consignación
                </label>
                <input
                  type="text"
                  value={transferDestino}
                  onChange={(e) => setTransferDestino(e.target.value)}
                  placeholder="Ej. Punto de Venta Centro / Boutique Aliada"
                  className="w-full bg-white rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Observaciones / Condiciones de Salida
                </label>
                <input
                  type="text"
                  value={transferNotas}
                  onChange={(e) => setTransferNotas(e.target.value)}
                  placeholder="Ej. Mercancía entregada a precio mayorista en consignación 15 días"
                  className="w-full bg-white rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#111111] text-white font-bold text-xs hover:bg-zinc-800 transition"
            >
              Ejecutar Traslado &amp; Asentar en Kardex
            </button>
          </form>

          {/* Right Column: Matriz de Stock por Ubicación & Historial de Traslados */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#F5F5F7] rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#111111]">
                    Control de Existencias por Ubicación (Bodega vs. Punto de Venta vs. Consignación)
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Distribución en tiempo real de cada referencia y precios al detal / mayor.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl p-2 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] text-zinc-400 uppercase">
                      <th className="py-2 px-2.5">Producto / Variante</th>
                      <th className="py-2 px-2 text-right">Detal / Mayor</th>
                      <th className="py-2 px-2 text-center">Bodega Princ.</th>
                      <th className="py-2 px-2 text-center">Punto Venta</th>
                      <th className="py-2 px-2 text-center">Consignación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.flatMap((prod) =>
                      prod.variantes.map((v) => (
                        <tr key={`${prod.id}-${v.id_variante}`}>
                          <td className="py-2 px-2.5">
                            <p className="font-bold text-[#111111]">{prod.nombre}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              Talla {v.talla} · {v.color} ({v.sku || prod.referencia})
                            </p>
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums">
                            <span className="font-bold text-[#111111] block">
                              {formatCOP(prod.precio_base)}
                            </span>
                            {prod.precio_mayorista && prod.precio_mayorista > 0 && (
                              <span className="text-[10px] text-zinc-500">
                                Mayor: {formatCOP(prod.precio_mayorista)}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-[#111111] tabular-nums">
                            {v.stock_disponible} un.
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 tabular-nums">
                            {v.stock_punto_venta || 0} un.
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-blue-700 tabular-nums">
                            {v.stock_consignacion || 0} un.
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historial Reciente de Traslados y Consignaciones */}
            <div className="bg-[#F5F5F7] rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#111111]">
                Bitácora de Traslados de Bodega y Consignaciones Recientes
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stockMoves
                  .filter(
                    (m) =>
                      m.tipoMovimiento === 'TRASLADO_BODEGA_POS' ||
                      m.tipoMovimiento === 'SALIDA_CONSIGNACION' ||
                      m.tipoMovimiento === 'RETORNO_CONSIGNACION'
                  )
                  .slice(0, 20)
                  .map((mv) => (
                    <div
                      key={mv.id}
                      className="bg-white p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#111111]">
                            {mv.documentoRef}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[10px] font-bold text-[#111111]">
                            {mv.tipoMovimiento}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {mv.fecha}
                          </span>
                        </div>
                        <p className="font-bold text-[#111111] mt-0.5">
                          {mv.productoNombre} ({mv.talla} · {mv.color})
                        </p>
                        <p className="text-[11px] text-zinc-500">{mv.motivo}</p>
                      </div>
                      <span className="font-mono font-black text-sm text-[#111111] shrink-0">
                        {Math.abs(mv.cantidad)} un.
                      </span>
                    </div>
                  ))}
                {stockMoves.filter(
                  (m) =>
                    m.tipoMovimiento === 'TRASLADO_BODEGA_POS' ||
                    m.tipoMovimiento === 'SALIDA_CONSIGNACION' ||
                    m.tipoMovimiento === 'RETORNO_CONSIGNACION'
                ).length === 0 && (
                  <div className="bg-white rounded-2xl p-5 text-center text-xs text-zinc-500">
                    Aún no se han registrado traslados de bodega en esta sesión. Usa el formulario izquierdo para mover unidades entre Bodega Principal, Punto de Venta y Consignación.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ABONO / LIQUIDAR SALDO DE CRÉDITO O CONSIGNACIÓN */}
      {paymentOrder && (
        <div
          onClick={() => setPaymentOrder(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleConfirmRegisterPayment}
            className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl text-left"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                  Recaudo de Cartera · {paymentOrder.modalidadVenta || 'Crédito'}
                </span>
                <h3 className="text-base font-black text-[#111111]">
                  Registrar Abono a {paymentOrder.invoiceNumber || paymentOrder.orderNumber}
                </h3>
                <p className="text-xs text-zinc-500">{paymentOrder.clienteNombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentOrder(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center"
              >
                <X className="w-4 h-4 text-[#111111]" />
              </button>
            </div>

            <div className="bg-[#F5F5F7] p-3.5 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Factura:</span>
                <span className="font-mono font-bold text-[#111111]">
                  {formatCOP(paymentOrder.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Abonado hasta hoy:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCOP(paymentOrder.montoAbonado || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-200 font-bold text-amber-800">
                <span>Saldo Pendiente Actual:</span>
                <span className="font-mono">
                  {formatCOP(
                    paymentOrder.saldoPendiente ??
                      Math.max(0, paymentOrder.total - (paymentOrder.montoAbonado || 0))
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Valor del Abono a Registrar ($ COP)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatThousandsInput(abonoInputAmount, true)}
                  onChange={(e) => setAbonoInputAmount(parseNumericInput(e.target.value))}
                  className="w-full bg-[#F5F5F7] rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-[#111111] tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Medio de Recaudo
                </label>
                <select
                  value={abonoMetodoPago}
                  onChange={(e) => setAbonoMetodoPago(e.target.value as MetodoPagoInterno)}
                  className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2.5 font-bold text-[#111111]"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia / Nequi">Transferencia / Nequi</option>
                  <option value="Tarjeta / Datáfono">Tarjeta / Datáfono</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentOrder(null)}
                className="w-1/3 py-3 rounded-full bg-[#F5F5F7] text-xs font-bold text-[#111111]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800"
              >
                Confirmar Abono
              </button>
            </div>
          </form>
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
                  Ajusta precios unitarios, modalidad (Detal, Mayor, Crédito, Consignación), abonos o productos
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Modalidad Operación
                  </label>
                  <select
                    value={editModalidad}
                    onChange={(e) => setEditModalidad(e.target.value as ModalidadVentaPOS)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 font-bold text-[#111111]"
                  >
                    <option value="Detal">Al Detal (PVP)</option>
                    <option value="Mayorista">Al Mayor</option>
                    <option value="Crédito">Venta a Crédito</option>
                    <option value="Consignación">En Consignación</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Ubicación Despacho
                  </label>
                  <select
                    value={editUbicacion}
                    onChange={(e) =>
                      setEditUbicacion(
                        e.target.value as 'Bodega Principal' | 'Punto de Venta POS'
                      )
                    }
                    className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 font-bold text-[#111111]"
                  >
                    <option value="Bodega Principal">Bodega Principal</option>
                    <option value="Punto de Venta POS">Punto de Venta POS</option>
                  </select>
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

              {/* Items Table within Invoice with Editable Unit Price */}
              <div className="space-y-2">
                <span className="font-bold text-[#111111] block">
                  Líneas de Productos en la Factura (Precio Unitario Editable)
                </span>
                <div className="space-y-2 max-h-52 overflow-y-auto bg-[#F5F5F7] p-3 rounded-2xl">
                  {editItems.map((item, idx) => (
                    <div
                      key={item.cartItemId}
                      className="bg-white p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#111111] truncate">{item.nombre}</p>
                        <p className="text-[10px] text-zinc-500">
                          Talla: <strong>{item.talla}</strong> · {item.color}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-400 font-bold">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={formatThousandsInput(item.precio, true)}
                          onChange={(e) => {
                            const next = [...editItems];
                            next[idx] = {
                              ...item,
                              precio: parseNumericInput(e.target.value),
                            };
                            setEditItems(next);
                          }}
                          className="w-24 bg-[#F5F5F7] rounded-lg px-2 py-1 font-mono font-bold text-[#111111] tabular-nums"
                        />
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

              {/* Status and Financial Values (Formatted with Thousands Dots) */}
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
                    <option value="Crédito / Plazo">Crédito / Plazo</option>
                    <option value="Consignación">Consignación</option>
                    <option value="Contraentrega">Contraentrega</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Costo de Envío ($)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatThousandsInput(editEnvio, true)}
                    onChange={(e) => setEditEnvio(parseNumericInput(e.target.value))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 font-mono font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                    Descuento ($)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatThousandsInput(editDescuento, true)}
                    onChange={(e) => setEditDescuento(parseNumericInput(e.target.value))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 font-mono font-bold tabular-nums"
                  />
                </div>
              </div>

              {(editModalidad === 'Crédito' || editModalidad === 'Consignación') && (
                <div className="grid grid-cols-2 gap-2.5 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                  <div>
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">
                      Monto Abonado ($)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatThousandsInput(editMontoAbonado, true)}
                      onChange={(e) => setEditMontoAbonado(parseNumericInput(e.target.value))}
                      className="w-full bg-white rounded-xl px-3 py-2 font-mono font-bold text-[#111111] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">
                      Fecha Vencimiento / Corte
                    </label>
                    <input
                      type="date"
                      value={editFechaVencimiento}
                      onChange={(e) => setEditFechaVencimiento(e.target.value)}
                      className="w-full bg-white rounded-xl px-3 py-2 font-mono text-[#111111]"
                    />
                  </div>
                </div>
              )}

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
                  Guardar Cambios &amp; Reconciliar Stock
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

      {/* MODAL: DIGITAL INVOICE PDF / PRINT */}
      <DigitalInvoiceModal
        order={selectedOrderForInvoice}
        onClose={() => setSelectedOrderForInvoice(null)}
      />
    </div>
  );
}
