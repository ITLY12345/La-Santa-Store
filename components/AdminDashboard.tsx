'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
import { PushNotificationToast } from './OrderTrackerModal';
import { POSDashboard } from './POSDashboard';
import {
  Package,
  TrendingUp,
  Settings,
  AlertTriangle,
  Lock,
  Plus,
  Minus,
  RotateCcw,
  Phone,
  KeyRound,
  Eye,
  ArrowLeft,
  Receipt,
  Trash2,
  Search,
  FileCheck2,
  X,
  Pencil,
  Upload,
  Truck,
  BellRing,
  Plug,
  CheckCircle2,
  MapPin,
  FileText,
} from 'lucide-react';

export function AdminDashboard() {
  const {
    isAdminAuthenticated,
    authenticateAdmin,
    logoutAdmin,
    products,
    createProduct,
    updateProduct,
    deleteProduct,
    updateVariantStock,
    updateProductAlertThreshold,
    resetToInitialCatalog,
    orders,
    createPosInvoice,
    updateOrderFull,
    deleteOrder,
    updateOrderStatus,
    criticalAlerts,
    storeConfig,
    updateStoreConfig,
    plugins,
    updatePluginConnector,
    triggerManualPushTest,
  } = useStore();

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'billing' | 'inventory' | 'plugins' | 'reports' | 'settings'
  >('billing');

  // Filter state in inventory tab
  const [categoryFilter, setCategoryFilter] = useState<
    'Todas' | 'Chanclas' | 'Camisetas' | 'Bolsos'
  >('Todas');
  const [inventorySearch, setInventorySearch] = useState('');
  const [onlyCriticalAlerts, setOnlyCriticalAlerts] = useState(false);

  // Filter & search state in Billing / Orders tab
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    'Todos' | EstadoPedido
  >('Todos');
  const [billingSearch, setBillingSearch] = useState('');
  const [adminToastMsg, setAdminToastMsg] = useState<string | null>(null);

  // POS Visual Terminal State (Create New Invoice)
  const [showPosBuilder, setShowPosBuilder] = useState(false);
  const [posCatalogSearch, setPosCatalogSearch] = useState('');
  const [posCatalogCategory, setPosCatalogCategory] = useState<
    'Todas' | 'Camisetas' | 'Bolsos' | 'Chanclas'
  >('Todas');
  const [posItems, setPosItems] = useState<CartItem[]>([]);
  const [posClienteNombre, setPosClienteNombre] = useState('');
  const [posClienteDoc, setPosClienteDoc] = useState('');
  const [posClienteTel, setPosClienteTel] = useState('');
  const [posClienteDir, setPosClienteDir] = useState('');
  const [posTransportadora, setPosTransportadora] = useState('');
  const [posGuia, setPosGuia] = useState('');
  const [posCostoEnvio, setPosCostoEnvio] = useState<number>(0);
  const [posDescuento, setPosDescuento] = useState<number>(0);
  const [posMetodoPago, setPosMetodoPago] = useState<MetodoPagoInterno>('Efectivo');
  const [posEstadoInicial, setPosEstadoInicial] = useState<EstadoPedido>('Facturado');
  const [posNotas, setPosNotas] = useState('');
  const [posFeedback, setPosFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Modify / Edit Existing Invoice or Order Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
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
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Invoice Confirmation Modal State
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Invoice preview modal state
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  // Product Create / Edit Modal with Photos State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodReferencia, setProdReferencia] = useState('');
  const [prodNombre, setProdNombre] = useState('');
  const [prodCategoria, setProdCategoria] = useState<'Camisetas' | 'Bolsos' | 'Chanclas'>(
    'Camisetas'
  );
  const [prodMarca, setProdMarca] = useState('');
  const [prodPrecio, setProdPrecio] = useState<number>(95000);
  const [prodAlertaMin, setProdAlertaMin] = useState<number>(4);
  const [prodDescripcion, setProdDescripcion] = useState('');
  const [prodImagenUrl, setProdImagenUrl] = useState('');
  const [prodVariantes, setProdVariantes] = useState<Variante[]>([]);
  const [prodModalError, setProdModalError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);

  // Settings form state
  const [newStoreName, setNewStoreName] = useState(storeConfig.storeName);
  const [newStoreNit, setNewStoreNit] = useState(storeConfig.storeNit);
  const [newPhone, setNewPhone] = useState(storeConfig.storePhone);
  const [newAddress, setNewAddress] = useState(storeConfig.storeAddress);
  const [newTagline, setNewTagline] = useState(storeConfig.corporateTagline);
  const [newPin, setNewPin] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const showToast = (msg: string) => {
    setAdminToastMsg(msg);
    setTimeout(() => setAdminToastMsg(null), 4000);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await authenticateAdmin(pinInput);
    if (ok) {
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  // Filtered products for visual POS terminal
  const posCatalogProducts = useMemo(() => {
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

  const handleAddVariantToPosTicket = (prod: Producto, variant: Variante) => {
    setPosFeedback(null);
    if (variant.stock_disponible <= 0) {
      setPosFeedback({ type: 'error', text: 'Esta variante está agotada en inventario.' });
      return;
    }

    const existingIdx = posItems.findIndex(
      (it) => it.productoId === prod.id && it.varianteId === variant.id_variante
    );

    if (existingIdx > -1) {
      const existing = posItems[existingIdx];
      if (existing.cantidad + 1 > variant.stock_disponible) {
        setPosFeedback({
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
    setPosFeedback(null);
    setPosItems((prev) =>
      prev
        .map((it) => {
          if (it.cartItemId !== cartItemId) return it;
          const nextQty = it.cantidad + delta;
          if (nextQty <= 0) return null;
          if (nextQty > it.stockMaximo) {
            setPosFeedback({
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

  const handleEmitPosInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setPosFeedback(null);

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
      setPosFeedback({ type: 'error', text: res.message || 'No se pudo emitir la factura.' });
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
    setPosNotas('');
    setShowPosBuilder(false);
    setSelectedOrderForInvoice(res.order);
    showToast(`Factura oficial ${res.order.invoiceNumber} creada exitosamente.`);
  };

  // Open Full Invoice / Order Editor Modal
  const openEditOrderModal = (ord: Order) => {
    setEditingOrder(ord);
    setEditNombre(ord.clienteNombre);
    setEditDoc(ord.clienteDocumento || '');
    setEditTel(ord.clienteTelefono || '');
    setEditDir(ord.clienteDireccion);
    setEditTransportadora(ord.transportadora || '');
    setEditGuia(ord.guiaSeguimiento || '');
    setEditItems(JSON.parse(JSON.stringify(ord.items)));
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
    setEditError(null);
  };

  const handleAddLineToEditOrder = () => {
    setEditError(null);
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

  const handleSaveEditedOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setEditError(null);

    const res = updateOrderFull(editingOrder.id, {
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
      setEditError(res.message || 'No se pudo actualizar la factura.');
      return;
    }

    const wasPushTriggered =
      (editEstado === 'Despachado' || editEstado === 'Entregado') &&
      editingOrder.estado !== editEstado;

    setEditingOrder(null);
    showToast(
      wasPushTriggered
        ? `Factura ${res.order.invoiceNumber || res.order.orderNumber} actualizada y Notificación Push enviada al cliente.`
        : `Factura ${res.order.invoiceNumber || res.order.orderNumber} modificada y stock reconciliado.`
    );
  };

  const handleConfirmDeleteOrder = () => {
    if (!orderToDelete) return;
    const label = orderToDelete.invoiceNumber || orderToDelete.orderNumber;
    deleteOrder(orderToDelete.id);
    setOrderToDelete(null);
    showToast(`Registro ${label} eliminado y unidades devueltas al inventario.`);
  };

  // Open Product Create / Edit Modal with Photos
  const openCreateProductModal = () => {
    const nextNum = String(products.length + 1).padStart(3, '0');
    setEditingProductId(null);
    setProdReferencia(`REF-${nextNum}`);
    setProdNombre('');
    setProdCategoria('Camisetas');
    setProdMarca('Colección Cartagena');
    setProdPrecio(95000);
    setProdAlertaMin(4);
    setProdDescripcion('');
    setProdImagenUrl(
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85'
    );
    setProdVariantes([
      {
        id_variante: `var-new-${nextNum}-1`,
        sku: `SKU-${nextNum}-01`,
        talla: 'M',
        color: 'Negro Mate',
        diseno_motivo: 'Edición Oficial',
        stock_disponible: 10,
      },
    ]);
    setProdModalError(null);
    setShowProductModal(true);
  };

  const openEditProductModal = (prod: Producto) => {
    setEditingProductId(prod.id);
    setProdReferencia(prod.referencia || `REF-${prod.id.slice(-4).toUpperCase()}`);
    setProdNombre(prod.nombre);
    setProdCategoria(prod.categoria);
    setProdMarca(prod.marca_motivo);
    setProdPrecio(prod.precio_base);
    setProdAlertaMin(prod.configuracion_alertas?.stock_minimo_alerta ?? 4);
    setProdDescripcion(prod.descripcion);
    setProdImagenUrl(prod.imagenes[0] || '');
    setProdVariantes(JSON.parse(JSON.stringify(prod.variantes)));
    setProdModalError(null);
    setShowProductModal(true);
  };

  // Handle Local Image Upload with Automatic Client-Side WebP Compression (Max 900x900px, ~45KB)
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProdModalError('Formato inválido. Selecciona una imagen JPG, PNG o WebP.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setProdModalError('La fotografía supera el límite de 8 MB. Elige un archivo más liviano.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const img = new window.Image();
      img.onload = () => {
        const MAX_DIM = 900;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
          setProdImagenUrl(compressedDataUrl);
          setProdModalError(null);
        } else {
          setProdImagenUrl(reader.result as string);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProductModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdModalError(null);

    if (!prodNombre.trim()) {
      setProdModalError('Ingresa el nombre del producto.');
      return;
    }
    if (prodVariantes.length === 0) {
      setProdModalError('El producto debe tener al menos una variante.');
      return;
    }

    const payload: Omit<Producto, 'id'> = {
      referencia: prodReferencia.trim() || 'REF-GEN',
      nombre: prodNombre.trim(),
      categoria: prodCategoria,
      marca_motivo: prodMarca.trim() || 'Colección Oficial',
      descripcion:
        prodDescripcion.trim() ||
        'Prenda de diseño minimalista con disponibilidad en tiempo real desde Cartagena de Indias.',
      imagenes: [
        prodImagenUrl.trim() ||
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85',
      ],
      precio_base: Math.max(0, Number(prodPrecio) || 0),
      configuracion_alertas: {
        stock_minimo_alerta: Math.max(0, Number(prodAlertaMin) || 3),
      },
      variantes: prodVariantes,
    };

    if (editingProductId) {
      await updateProduct({ ...payload, id: editingProductId });
      showToast(`Producto "${payload.nombre}" actualizado en el inventario POS.`);
    } else {
      await createProduct(payload);
      showToast(`Producto "${payload.nombre}" creado con éxito en el inventario POS.`);
    }

    setShowProductModal(false);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const name = productToDelete.nombre;
    await deleteProduct(productToDelete.id);
    setProductToDelete(null);
    showToast(`Producto "${name}" eliminado del catálogo.`);
  };

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== 'Todas' && p.categoria !== categoryFilter) return false;
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase().trim();
      const matchName = p.nombre.toLowerCase().includes(q);
      const matchRef = p.referencia?.toLowerCase().includes(q) ?? false;
      const matchBrand = p.marca_motivo.toLowerCase().includes(q);
      if (!matchName && !matchRef && !matchBrand) return false;
    }
    if (onlyCriticalAlerts) {
      const minThresh = p.configuracion_alertas?.stock_minimo_alerta ?? 3;
      return p.variantes.some((v) => v.stock_disponible <= minThresh);
    }
    return true;
  });

  const filteredOrders = orders.filter((ord) => {
    if (orderStatusFilter !== 'Todos' && ord.estado !== orderStatusFilter) return false;
    if (billingSearch.trim()) {
      const q = billingSearch.toLowerCase().trim();
      const matchNum = ord.orderNumber.toLowerCase().includes(q);
      const matchInv = ord.invoiceNumber?.toLowerCase().includes(q) ?? false;
      const matchClient = ord.clienteNombre.toLowerCase().includes(q);
      const matchDoc = ord.clienteDocumento?.toLowerCase().includes(q) ?? false;
      const matchGuia = ord.guiaSeguimiento?.toLowerCase().includes(q) ?? false;
      if (!matchNum && !matchInv && !matchClient && !matchDoc && !matchGuia) return false;
    }
    return true;
  });

  const totalFacturado = orders
    .filter(
      (o) =>
        o.estado === 'Facturado' || o.estado === 'Despachado' || o.estado === 'Entregado'
    )
    .reduce((sum, o) => sum + o.total, 0);

  const countFacturasEmitidas = orders.filter(
    (o) =>
      o.estado === 'Facturado' || o.estado === 'Despachado' || o.estado === 'Entregado'
  ).length;

  const countPendientes = orders.filter((o) => o.estado === 'Pendiente').length;

  const totalPotencial = orders
    .filter((o) => o.estado !== 'Cancelado')
    .reduce((sum, o) => sum + o.total, 0);

  const totalUnidadesFacturadas = orders
    .filter(
      (o) =>
        o.estado === 'Facturado' || o.estado === 'Despachado' || o.estado === 'Entregado'
    )
    .reduce((sum, o) => sum + o.items.reduce((acc, it) => acc + it.cantidad, 0), 0);

  const totalStockActualBodega = products.reduce(
    (acc, p) => acc + p.variantes.reduce((sum, v) => sum + v.stock_disponible, 0),
    0
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreConfig({
      storeName: newStoreName.trim() || 'Store Oficial',
      storeNit: newStoreNit.trim() || '901.482.319-4',
      storePhone: newPhone.trim(),
      storeAddress:
        newAddress.trim() || 'Cartagena de Indias, Colombia · Despachos Nacionales',
      corporateTagline: newTagline.trim(),
      ...(newPin.trim().length >= 4 ? { adminPin: newPin.trim() } : {}),
    });
    setNewPin('');
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col">
      {/* Live Push Notification Toast Preview */}
      <PushNotificationToast onOpenTracker={() => {}} />

      {/* Admin Operation Feedback Toast */}
      {adminToastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111111] text-white px-5 py-3.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{adminToastMsg}</span>
        </div>
      )}

      {/* Dedicated Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-zinc-100 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-zinc-200 text-xs font-bold text-[#111111] flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la Tienda</span>
            </Link>

            <div className="h-5 w-[1px] bg-zinc-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-zinc-200 bg-[#111111]">
                <Image
                  src="/assets/brand/logo-la-santa.png"
                  alt="Logo"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-[#111111]">
                  Consola Administrativa POS · Cartagena
                </h1>
                <p className="text-[11px] text-zinc-500 hidden sm:block">
                  Facturación POS · Inventario Fotográfico · Notificaciones Push · Plugins API
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminAuthenticated && (
              <button
                onClick={logoutAdmin}
                className="px-4 py-2 rounded-full bg-[#F5F5F7] text-[#111111] hover:bg-red-50 hover:text-red-600 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Gate: PIN Screen (NO PIN SUGGESTION / NO 1234 HINT) */}
      {!isAdminAuthenticated ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <form
            onSubmit={handlePinSubmit}
            className="w-full max-w-sm bg-[#F5F5F7] rounded-3xl p-7 text-center space-y-5"
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-zinc-200 mx-auto bg-[#111111]">
              <Image
                src="/assets/brand/logo-la-santa.png"
                alt="Logo"
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <Lock className="w-3 h-3" />
                <span>Sede Cartagena de Indias</span>
              </div>
              <h2 className="text-lg font-extrabold text-[#111111]">
                Acceso al Sistema POS
              </h2>
              <p className="text-xs text-zinc-500">
                Ingresa tu código PIN de seguridad para operar la facturación, el inventario y los despachos.
              </p>
            </div>

            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                aria-label="Código PIN de seguridad"
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-3 bg-white border border-zinc-200 rounded-2xl text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  Código PIN inválido. Verifica tus credenciales de administrador.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#111111] text-white font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 transition"
            >
              Ingresar al Sistema POS
            </button>

            <div className="pt-2 border-t border-zinc-200">
              <Link
                href="/"
                className="text-xs text-zinc-500 hover:text-[#111111] inline-flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Regresar al catálogo público</span>
              </Link>
            </div>
          </form>
        </main>
      ) : (
        /* Main Authenticated Page Content */
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Navigation Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                activeTab === 'billing'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Facturación POS & Despachos</span>
              <span className="text-[11px] font-mono opacity-80 tabular-nums">
                ({orders.length})
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                activeTab === 'inventory'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventario POS con Fotos</span>
              <span className="text-[11px] font-mono opacity-80 tabular-nums">
                ({products.length})
              </span>
            </button>

            <button
              onClick={() => setActiveTab('plugins')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                activeTab === 'plugins'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
              }`}
            >
              <Plug className="w-4 h-4" />
              <span>Plugins, Pasarelas & API</span>
              <span className="text-[11px] font-mono opacity-80 tabular-nums">
                ({plugins.filter((p) => p.activo).length}/{plugins.length})
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                activeTab === 'reports'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Métricas & Kardex</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configuración Cartagena</span>
            </button>
          </div>

          {/* TAB 1: TERMINAL DE FACTURACIÓN POS PROFESIONAL & DESPACHOS */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <POSDashboard />
            </div>
          )}

          {false && activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Top Billing KPIs & POS Action */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#F5F5F7] rounded-3xl p-4">
                  <span className="text-[11px] text-zinc-500 font-semibold uppercase">
                    Ingresos Facturados
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-[#111111] tabular-nums mt-1">
                    {formatCOP(totalFacturado)}
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    {countFacturasEmitidas} facturas en firme
                  </span>
                </div>

                <div className="bg-[#F5F5F7] rounded-3xl p-4">
                  <span className="text-[11px] text-zinc-500 font-semibold uppercase">
                    Pedidos por Facturar
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-[#111111] tabular-nums mt-1">
                    {countPendientes}
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    Recibidos vía WhatsApp
                  </span>
                </div>

                <div className="bg-[#F5F5F7] rounded-3xl p-4">
                  <span className="text-[11px] text-zinc-500 font-semibold uppercase">
                    Consecutivo POS Actual
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-[#111111] font-mono tabular-nums mt-1">
                    FAC-{storeConfig.nextInvoiceSequence || 1003}
                  </p>
                  <span className="text-[11px] text-zinc-500">Sede Cartagena de Indias</span>
                </div>

                <div className="bg-[#F5F5F7] rounded-3xl p-4 flex flex-col justify-between">
                  <span className="text-[11px] text-[#111111] font-bold uppercase">
                    Terminal Punto de Venta
                  </span>
                  <button
                    onClick={() => setShowPosBuilder(!showPosBuilder)}
                    className="mt-2 w-full py-2.5 px-3 rounded-full bg-[#111111] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{showPosBuilder ? 'Cerrar Terminal POS' : 'Abrir Caja / Nueva Factura'}</span>
                  </button>
                </div>
              </div>

              {/* Visual POS Terminal (Split View: Left Visual Product Catalog with Photos | Right POS Ticket & Customer) */}
              {showPosBuilder && (
                <div className="bg-[#F5F5F7] border border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                    <div className="flex items-center gap-2.5">
                      <Receipt className="w-5 h-5 text-[#111111]" />
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-[#111111]">
                          Terminal de Facturación POS · Consecutivo FAC-{storeConfig.nextInvoiceSequence || 1003}
                        </h2>
                        <p className="text-xs text-zinc-500">
                          Selecciona prendas haciendo clic en su talla disponible, verifica el ticket y emite la factura con descuento automático de stock.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPosBuilder(false)}
                      className="w-8 h-8 rounded-full bg-white text-[#111111] hover:bg-zinc-200 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column (7 cols): Visual Product Selector with Photos */}
                    <div className="lg:col-span-7 bg-white rounded-3xl p-4 space-y-3 border border-zinc-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
                          1. Catálogo Visual POS (Toca una talla para agregar)
                        </h3>
                        <div className="flex items-center gap-1 text-[11px]">
                          {(['Todas', 'Camisetas', 'Bolsos', 'Chanclas'] as const).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setPosCatalogCategory(c)}
                              className={`px-2.5 py-1 rounded-full font-bold transition ${
                                posCatalogCategory === c
                                  ? 'bg-[#111111] text-white'
                                  : 'bg-[#F5F5F7] text-zinc-600'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                          type="text"
                          value={posCatalogSearch}
                          onChange={(e) => setPosCatalogSearch(e.target.value)}
                          placeholder="Buscar por nombre o referencia (ej. REF-CAM-02)..."
                          className="w-full bg-[#F5F5F7] rounded-full pl-9 pr-3 py-2 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                        {posCatalogProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="p-3 rounded-2xl bg-[#F5F5F7] flex flex-col justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 border border-zinc-200">
                                <img
                                  src={
                                    prod.imagenes[0] ||
                                    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85'
                                  }
                                  alt={prod.nombre}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-mono text-zinc-500 block">
                                  {prod.referencia || prod.categoria}
                                </span>
                                <h4 className="text-xs font-bold text-[#111111] truncate">
                                  {prod.nombre}
                                </h4>
                                <span className="text-xs font-extrabold text-[#111111] tabular-nums">
                                  {formatCOP(prod.precio_base)}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-200/70">
                              {prod.variantes.map((v) => {
                                const out = v.stock_disponible <= 0;
                                return (
                                  <button
                                    key={v.id_variante}
                                    type="button"
                                    disabled={out}
                                    onClick={() => handleAddVariantToPosTicket(prod, v)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                      out
                                        ? 'bg-zinc-200 text-zinc-400 line-through cursor-not-allowed'
                                        : 'bg-white hover:bg-[#111111] hover:text-white text-[#111111] border border-zinc-200 shadow-2xs active:scale-95'
                                    }`}
                                    title={`${v.color} · ${v.diseno_motivo}`}
                                  >
                                    <span>{v.talla}</span>
                                    <span className="text-[10px] opacity-70 font-mono">
                                      ({v.stock_disponible})
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column (5 cols): POS Ticket & Customer Checkout */}
                    <form
                      onSubmit={handleEmitPosInvoice}
                      className="lg:col-span-5 bg-white rounded-3xl p-4 space-y-4 border border-zinc-100 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
                            2. Ticket de Venta ({posItems.reduce((a, b) => a + b.cantidad, 0)} un.)
                          </h3>
                          {posItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setPosItems([])}
                              className="text-[11px] text-red-600 font-semibold hover:underline"
                            >
                              Limpiar Ticket
                            </button>
                          )}
                        </div>

                        {posFeedback && (
                          <p
                            className={`text-xs font-semibold p-2.5 rounded-xl ${
                              posFeedback?.type === 'error'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {posFeedback?.text}
                          </p>
                        )}

                        {posItems.length === 0 ? (
                          <div className="py-8 text-center bg-[#F5F5F7] rounded-2xl text-xs text-zinc-400">
                            Toca cualquier talla del catálogo izquierdo para agregarla al ticket POS.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {posItems.map((it) => (
                              <div
                                key={it.cartItemId}
                                className="p-2.5 rounded-2xl bg-[#F5F5F7] flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={it.imagen}
                                    alt={it.nombre}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-xl object-cover bg-white shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-[#111111] truncate">
                                      {it.nombre}
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                      Talla {it.talla} · {it.color}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex items-center bg-white rounded-full px-1 py-0.5 border border-zinc-200">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePosLineQty(it.cartItemId, -1)}
                                      className="w-5 h-5 flex items-center justify-center font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="w-5 text-center font-mono font-bold tabular-nums">
                                      {it.cantidad}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePosLineQty(it.cartItemId, 1)}
                                      className="w-5 h-5 flex items-center justify-center font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <span className="font-bold text-[#111111] tabular-nums w-18 text-right">
                                    {formatCOP(it.precio * it.cantidad)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Customer & Logistics Fields */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-xs">
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              Cliente / Razón Social
                            </label>
                            <input
                              type="text"
                              value={posClienteNombre}
                              onChange={(e) => setPosClienteNombre(e.target.value)}
                              placeholder="Cliente Mostrador"
                              className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              Cédula / NIT
                            </label>
                            <input
                              type="text"
                              value={posClienteDoc}
                              onChange={(e) => setPosClienteDoc(e.target.value)}
                              placeholder="222222222222"
                              className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              Teléfono / WhatsApp
                            </label>
                            <input
                              type="text"
                              value={posClienteTel}
                              onChange={(e) => setPosClienteTel(e.target.value)}
                              placeholder="3001234567"
                              className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              Dirección / Barrio Cartagena
                            </label>
                            <input
                              type="text"
                              value={posClienteDir}
                              onChange={(e) => setPosClienteDir(e.target.value)}
                              placeholder="Bocagrande, Cartagena"
                              className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              Medio de Pago
                            </label>
                            <select
                              value={posMetodoPago}
                              onChange={(e) =>
                                setPosMetodoPago(e.target.value as MetodoPagoInterno)
                              }
                              className="w-full bg-[#F5F5F7] rounded-xl px-2 py-2 text-xs"
                            >
                              <option value="Efectivo">Efectivo</option>
                              <option value="Transferencia / Nequi">Transferencia / Nequi</option>
                              <option value="Tarjeta / Datáfono">Tarjeta / Datáfono</option>
                              <option value="Contraentrega">Contraentrega</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              Estado Inicial
                            </label>
                            <select
                              value={posEstadoInicial}
                              onChange={(e) =>
                                setPosEstadoInicial(e.target.value as EstadoPedido)
                              }
                              className="w-full bg-[#F5F5F7] rounded-xl px-2 py-2 text-xs font-bold"
                            >
                              <option value="Facturado">Facturado</option>
                              <option value="Despachado">Despachado (Envía Push)</option>
                              <option value="Entregado">Entregado (Envía Push)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              Envío ($ COP)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              value={posCostoEnvio}
                              onChange={(e) =>
                                setPosCostoEnvio(Math.max(0, Number(e.target.value)))
                              }
                              className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 text-xs font-mono tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 font-semibold block mb-1">
                              Descuento ($ COP)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              value={posDescuento}
                              onChange={(e) =>
                                setPosDescuento(Math.max(0, Number(e.target.value)))
                              }
                              className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 text-xs font-mono tabular-nums"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-500">Total a Cobrar</span>
                          <span className="text-xl font-extrabold text-[#111111] tabular-nums">
                            {formatCOP(posGrandTotal)}
                          </span>
                        </div>
                        <button
                          type="submit"
                          disabled={posItems.length === 0}
                          className="w-full py-3.5 rounded-full bg-[#111111] text-white font-bold text-xs disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-zinc-800 transition"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>Emitir Factura POS ({formatCOP(posGrandTotal)})</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Filters & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F5F5F7] p-3 rounded-3xl">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  {(
                    [
                      'Todos',
                      'Pendiente',
                      'Facturado',
                      'Despachado',
                      'Entregado',
                      'Cancelado',
                    ] as const
                  ).map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                        orderStatusFilter === st
                          ? 'bg-[#111111] text-white'
                          : 'text-zinc-500 hover:text-[#111111] bg-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={billingSearch}
                    onChange={(e) => setBillingSearch(e.target.value)}
                    placeholder="Buscar FAC-1001, cliente, guía o NIT..."
                    className="w-full bg-white rounded-full pl-9 pr-3 py-1.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#111111]"
                  />
                </div>
              </div>

              {/* Orders & Invoices List with Create, Modify, Delete & Push Triggers */}
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-[#F5F5F7] rounded-3xl text-zinc-500 text-xs">
                  No se encontraron facturas ni pedidos con estos criterios.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-[#F5F5F7] rounded-3xl p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {ord.invoiceNumber ? (
                              <span className="font-mono font-extrabold text-[#111111] text-sm">
                                {ord.invoiceNumber}
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-zinc-600">
                                {ord.orderNumber}
                              </span>
                            )}
                            <span className="text-zinc-300">·</span>
                            <span className="text-zinc-500">{ord.origen}</span>
                            <span className="text-zinc-300">·</span>
                            <span className="text-zinc-500">{ord.metodoPagoInterno}</span>
                            <span className="text-zinc-300">·</span>
                            <span className="text-[11px] font-semibold text-[#111111]">
                              {ord.stockDeducted
                                ? '✓ Stock descontado'
                                : '⏳ Stock sin descontar'}
                            </span>
                          </div>

                          <p className="text-sm font-bold text-[#111111]">
                            {ord.clienteNombre}{' '}
                            {ord.clienteDocumento && (
                              <span className="text-xs font-mono text-zinc-500 font-normal">
                                (NIT/CC: {ord.clienteDocumento})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {ord.clienteDireccion}{' '}
                            {ord.clienteTelefono ? `· Tel: ${ord.clienteTelefono}` : ''} · Fecha:{' '}
                            {ord.fecha}
                          </p>
                          {(ord.transportadora || ord.guiaSeguimiento) && (
                            <p className="text-[11px] text-[#111111] font-medium flex items-center gap-1.5 pt-0.5">
                              <Truck className="w-3.5 h-3.5" />
                              <span>
                                Despacho: {ord.transportadora || 'Mensajería Cartagena'}{' '}
                                {ord.guiaSeguimiento ? `· Guía: ${ord.guiaSeguimiento}` : ''}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Complete POS Action Bar: Status Selector (with Push Alert), Modify, Print, Delete */}
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={ord.estado}
                            onChange={(e) => {
                              const nextSt = e.target.value as EstadoPedido;
                              updateOrderStatus(ord.id, nextSt);
                              if (nextSt === 'Despachado' || nextSt === 'Entregado') {
                                showToast(
                                  `Estado cambiado a "${nextSt}" y Notificación Push enviada al cliente.`
                                );
                              } else {
                                showToast(`Estado actualizado a "${nextSt}".`);
                              }
                            }}
                            aria-label="Cambiar estado del pedido"
                            className="text-xs font-bold py-1.5 px-3 rounded-full bg-white border border-zinc-200 text-[#111111] focus:outline-none"
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Facturado">Facturado (Descuenta Stock)</option>
                            <option value="Despachado">Despachado (Envía Push 🔔)</option>
                            <option value="Entregado">Entregado (Envía Push 🔔)</option>
                            <option value="Cancelado">Cancelado (Devuelve Stock)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => openEditOrderModal(ord)}
                            className="px-3.5 py-1.5 rounded-full bg-[#111111] text-white hover:bg-zinc-800 text-xs font-bold transition flex items-center gap-1.5"
                            title="Modificar o Facturar este registro"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>{ord.estado === 'Pendiente' ? 'Facturar / Editar' : 'Modificar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForInvoice(ord)}
                            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-xs font-bold text-[#111111] transition flex items-center gap-1.5"
                            title="Ver e imprimir comprobante"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Factura</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setOrderToDelete(ord)}
                            className="w-8 h-8 rounded-full bg-white hover:bg-red-50 text-zinc-500 hover:text-red-600 transition flex items-center justify-center"
                            title="Eliminar factura y restaurar stock"
                            aria-label="Eliminar factura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs space-y-1">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-zinc-600 items-center">
                            <div className="flex items-center gap-2">
                              <img
                                src={it.imagen}
                                alt={it.nombre}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-md object-cover bg-white"
                              />
                              <span>
                                <strong className="text-[#111111] font-mono">{it.cantidad}x</strong>{' '}
                                {it.nombre} ({it.talla} · {it.color})
                              </span>
                            </div>
                            <span className="tabular-nums font-semibold text-[#111111]">
                              {formatCOP(it.precio * it.cantidad)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-zinc-200 pt-2.5 flex flex-wrap justify-between items-center text-xs gap-2">
                        <div className="text-zinc-500 space-x-3">
                          <span>Subtotal: {formatCOP(ord.subtotal)}</span>
                          <span>
                            Envío: {ord.costoEnvio > 0 ? formatCOP(ord.costoEnvio) : ord.envioTexto}
                          </span>
                          {ord.descuentoManual && ord.descuentoManual > 0 ? (
                            <span>Descuento: -{formatCOP(ord.descuentoManual)}</span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 uppercase text-[11px] font-bold">
                            Total:
                          </span>
                          <span className="text-base font-extrabold text-[#111111] tabular-nums">
                            {formatCOP(ord.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SISTEMA DE INVENTARIO POS PROFESIONAL CON FOTOS */}
          {activeTab === 'inventory' && (
            <div className="space-y-5">
              {/* Top Inventory Header & New Product Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F5F5F7] p-4 rounded-3xl">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#111111]">
                    Gestión de Inventario POS con Fotografías
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Crea nuevas prendas con foto, edita precios y administra existencias por variante en tiempo real.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateProductModal}
                  className="px-5 py-2.5 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-800 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Producto con Foto</span>
                </button>
              </div>

              {criticalAlerts.length > 0 && (
                <div className="p-4 rounded-3xl bg-[#F5F5F7] border border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-[#111111] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#111111]">
                        {criticalAlerts.length} Variantes en Nivel de Stock Crítico en Bodega Cartagena
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Las unidades se descuentan automáticamente al emitir facturas y se restauran si una factura se modifica o elimina.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOnlyCriticalAlerts(!onlyCriticalAlerts)}
                    className="px-4 py-1.5 rounded-full bg-[#111111] text-white text-xs font-bold"
                  >
                    {onlyCriticalAlerts ? 'Mostrar Todos' : 'Ver Solo Críticos'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F5F5F7] p-3 rounded-3xl">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  {(['Todas', 'Chanclas', 'Camisetas', 'Bolsos'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3.5 py-1.5 rounded-full font-bold transition ${
                        categoryFilter === cat
                          ? 'bg-[#111111] text-white'
                          : 'text-zinc-500 hover:text-[#111111] bg-white'
                      }`}
                    >
                      {cat === 'Todas' ? 'Todas las Categorías' : cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Buscar producto o referencia..."
                    className="w-full bg-white rounded-full pl-9 pr-3 py-1.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {filteredProducts.map((prod) => {
                  const minThresh = prod.configuracion_alertas?.stock_minimo_alerta ?? 3;
                  const totalPStock = prod.variantes.reduce((s, v) => s + v.stock_disponible, 0);

                  return (
                    <div
                      key={prod.id}
                      className="bg-[#F5F5F7] rounded-3xl p-4 sm:p-5 space-y-4"
                    >
                      {/* Product Header with Studio Photo & Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-18 h-18 rounded-2xl overflow-hidden bg-white border border-zinc-200 shrink-0">
                            <img
                              src={
                                prod.imagenes[0] ||
                                'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85'
                              }
                              alt={prod.nombre}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                              <span className="font-mono text-[#111111]">
                                {prod.referencia || prod.id.toUpperCase()}
                              </span>
                              <span>·</span>
                              <span>{prod.categoria}</span>
                              <span>·</span>
                              <span>{prod.marca_motivo}</span>
                            </div>
                            <h3 className="text-base font-extrabold text-[#111111] mt-0.5">
                              {prod.nombre}
                            </h3>
                            <p className="text-sm font-extrabold text-[#111111] tabular-nums mt-0.5">
                              {formatCOP(prod.precio_base)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 text-xs">
                          <span className="px-3 py-1.5 rounded-full bg-white text-zinc-600 border border-zinc-200">
                            Existencias:{' '}
                            <strong className="font-mono text-[#111111] tabular-nums">
                              {totalPStock} un.
                            </strong>
                          </span>

                          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-zinc-200">
                            <span className="text-[11px] text-zinc-500">Alerta &le;</span>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={minThresh}
                              onChange={(e) =>
                                updateProductAlertThreshold(prod.id, Number(e.target.value) || 1)
                              }
                              className="w-10 bg-transparent text-center font-bold text-[#111111] text-xs focus:outline-none tabular-nums"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => openEditProductModal(prod)}
                            className="px-4 py-1.5 rounded-full bg-[#111111] text-white font-bold flex items-center gap-1.5 hover:bg-zinc-800 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar Producto / Foto</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setProductToDelete(prod)}
                            className="w-8 h-8 rounded-full bg-white hover:bg-red-50 text-zinc-500 hover:text-red-600 flex items-center justify-center transition"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Variant Matrix Table */}
                      <div className="overflow-x-auto bg-white rounded-2xl p-2">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-100 text-[11px] text-zinc-400 uppercase">
                              <th className="py-2 px-3">SKU</th>
                              <th className="py-2 px-2">Color</th>
                              <th className="py-2 px-2">Talla</th>
                              <th className="py-2 px-2">Edición</th>
                              <th className="py-2 px-2 text-center">Disponible</th>
                              <th className="py-2 px-3 text-right">Ajuste Rápido POS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {prod.variantes.map((v) => {
                              const isCritical = v.stock_disponible <= minThresh;
                              const isOutOfStock = v.stock_disponible === 0;

                              return (
                                <tr key={v.id_variante}>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500">
                                    {v.sku || v.id_variante.toUpperCase()}
                                  </td>
                                  <td className="py-2.5 px-2 text-[#111111] font-medium">
                                    {v.color}
                                  </td>
                                  <td className="py-2.5 px-2 font-bold text-[#111111]">
                                    {v.talla}
                                  </td>
                                  <td className="py-2.5 px-2 text-zinc-500 text-[11px]">
                                    {v.diseno_motivo}
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <span
                                      className={`font-mono font-bold tabular-nums ${
                                        isOutOfStock
                                          ? 'text-red-600'
                                          : isCritical
                                          ? 'text-amber-600'
                                          : 'text-[#111111]'
                                      }`}
                                    >
                                      {v.stock_disponible} un.
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        onClick={() =>
                                          updateVariantStock(
                                            prod.id,
                                            v.id_variante,
                                            v.stock_disponible - 1
                                          )
                                        }
                                        disabled={v.stock_disponible <= 0}
                                        className="w-7 h-7 rounded-full bg-[#F5F5F7] hover:bg-zinc-200 text-[#111111] flex items-center justify-center disabled:opacity-25"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          updateVariantStock(
                                            prod.id,
                                            v.id_variante,
                                            v.stock_disponible + 1
                                          )
                                        }
                                        className="w-7 h-7 rounded-full bg-[#F5F5F7] hover:bg-zinc-200 text-[#111111] flex items-center justify-center"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PLUGINS, PASARELAS DE PAGO Y ARQUITECTURA BACKEND */}
          {activeTab === 'plugins' && (
            <div className="space-y-5">
              <div className="bg-[#F5F5F7] rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Arquitectura Backend API REST · Sede Cartagena
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#111111]">
                    Centro de Plugins, Pasarelas de Pago y Conectores Logísticos
                  </h2>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    El backend de la tienda opera sobre controladores REST transaccionales (<code>/api/store</code>, <code>/api/products</code>, <code>/api/orders</code>, <code>/api/plugins</code> y <code>/api/webhooks</code>) preparados para activar pasarelas de pago y transportadoras sin modificar el núcleo del sistema.
                  </p>
                </div>

                {orders[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerManualPushTest(orders[0], 'Despachado');
                      showToast('Notificación Push de prueba disparada correctamente.');
                    }}
                    className="px-4 py-2.5 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-800 transition shrink-0"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>Simular Push de Despacho</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plugins.map((plg) => (
                  <div
                    key={plg.id}
                    className="bg-[#F5F5F7] rounded-3xl p-5 flex flex-col justify-between space-y-4 border border-zinc-200/70"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full bg-white text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                          {plg.categoria}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                            plg.activo
                              ? 'bg-[#111111] text-white'
                              : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {plg.activo ? 'Conector Activo' : 'Listo para Activar'}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-[#111111]">
                        {plg.nombre}
                      </h3>
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        {plg.descripcion}
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl p-3.5 space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                            Entorno de Operación
                          </label>
                          <select
                            value={plg.modo}
                            onChange={(e) =>
                              updatePluginConnector(plg.id, {
                                modo: e.target.value as 'Sandbox / Pruebas' | 'Producción',
                              })
                            }
                            className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#111111]"
                          >
                            <option value="Sandbox / Pruebas">Sandbox / Pruebas</option>
                            <option value="Producción">Producción</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                            Llave Pública / ID Comercio
                          </label>
                          <input
                            type="text"
                            value={plg.publicKey || ''}
                            onChange={(e) =>
                              updatePluginConnector(plg.id, { publicKey: e.target.value })
                            }
                            placeholder="Ingresa llave API..."
                            className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#111111]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                        <span className="font-mono truncate">Webhook: {plg.webhookUrl}</span>
                        <span>{plg.comisionTexto}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-zinc-500">
                        {plg.ultimaSincronizacion}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          updatePluginConnector(plg.id, { activo: !plg.activo });
                          showToast(
                            !plg.activo
                              ? `Conector "${plg.nombre}" activado en el backend.`
                              : `Conector "${plg.nombre}" puesto en espera.`
                          );
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                          plg.activo
                            ? 'bg-white text-[#111111] border border-zinc-300 hover:bg-zinc-100'
                            : 'bg-[#111111] text-white hover:bg-zinc-800'
                        }`}
                      >
                        {plg.activo ? 'Desactivar Conector' : 'Conectar / Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MÉTRICAS Y REPORTES FINANCIEROS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#F5F5F7] p-4 rounded-3xl">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Total Facturado Oficial
                  </span>
                  <p className="text-xl font-extrabold text-[#111111] tabular-nums mt-1">
                    {formatCOP(totalFacturado)}
                  </p>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-3xl">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Volumen Bruto Activo
                  </span>
                  <p className="text-xl font-extrabold text-[#111111] tabular-nums mt-1">
                    {formatCOP(totalPotencial)}
                  </p>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-3xl">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Unidades Facturadas
                  </span>
                  <p className="text-xl font-extrabold text-[#111111] tabular-nums mt-1">
                    {totalUnidadesFacturadas} un.
                  </p>
                </div>

                <div className="bg-[#F5F5F7] p-4 rounded-3xl">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Inventario en Cartagena
                  </span>
                  <p className="text-xl font-extrabold text-[#111111] tabular-nums mt-1">
                    {totalStockActualBodega} un.
                  </p>
                </div>
              </div>

              <div className="bg-[#F5F5F7] rounded-3xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Valoración de Inventario por Referencia (Bodega Cartagena)
                </h4>
                <div className="space-y-2.5 text-xs">
                  {products.map((p, idx) => {
                    const totalStock = p.variantes.reduce((s, v) => s + v.stock_disponible, 0);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              p.imagenes[0] ||
                              'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85'
                            }
                            alt={p.nombre}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover bg-[#F5F5F7]"
                          />
                          <div>
                            <p className="font-bold text-[#111111]">
                              0{idx + 1}. {p.nombre}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {p.referencia || p.id} · {p.categoria} · {p.marca_motivo}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#111111] tabular-nums">
                            {formatCOP(p.precio_base * totalStock)} en stock
                          </p>
                          <p className="text-[11px] text-zinc-500 tabular-nums">
                            {totalStock} un. × {formatCOP(p.precio_base)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONFIGURACIÓN CORPORATIVA CARTAGENA */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form
                onSubmit={handleSaveSettings}
                className="bg-[#F5F5F7] rounded-3xl p-5 space-y-4"
              >
                <h3 className="text-sm font-extrabold text-[#111111]">
                  Datos Corporativos y Sede Cartagena de Indias
                </h3>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">
                    Razón Social / Nombre de la Tienda
                  </label>
                  <input
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">
                    NIT / Identificación Tributaria
                  </label>
                  <input
                    type="text"
                    value={newStoreNit}
                    onChange={(e) => setNewStoreNit(e.target.value)}
                    className="w-full bg-white rounded-2xl px-3.5 py-2.5 text-xs text-[#111111] font-mono focus:outline-none focus:ring-1 focus:ring-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">
                    Ciudad Base de Operaciones y Despachos
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full bg-white rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">
                    Leyenda Corporativa Oficial (Pie de Página)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                    <textarea
                      rows={3}
                      value={newTagline}
                      onChange={(e) => setNewTagline(e.target.value)}
                      className="w-full bg-white rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">
                    Número de WhatsApp Oficial (con indicativo de país)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Ej. 573105559876"
                      className="w-full bg-white rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-[#111111] font-mono focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">
                    Cambiar PIN de Seguridad Administrativo
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-white rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#111111] text-white font-bold text-xs rounded-full hover:bg-zinc-800 transition"
                  >
                    Guardar Parámetros
                  </button>
                  {settingsSuccess && (
                    <span className="text-xs text-[#111111] font-semibold">
                      ✓ Configuración sincronizada en servidor
                    </span>
                  )}
                </div>
              </form>

              <div className="bg-[#F5F5F7] rounded-3xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-sm font-extrabold text-[#111111]">
                    Restauración de Datos de Fábrica
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Si deseas reiniciar las pruebas de inventario, facturación POS y notificaciones push a su estado inicial en Cartagena de Indias, puedes restablecer la base de datos del servidor.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
                  {resetSuccess ? (
                    <span className="text-xs text-[#111111] font-semibold">
                      ✓ Catálogo y facturas reiniciados
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-500">Sincronizado con API REST</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      resetToInitialCatalog();
                      setResetSuccess(true);
                      setTimeout(() => setResetSuccess(false), 3000);
                    }}
                    className="px-4 py-2 rounded-full bg-white hover:bg-red-50 text-xs font-bold text-[#111111] hover:text-red-600 flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer Base de Datos</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* MODAL 1: FULL POS INVOICE & ORDER EDITOR (Modificar Factura / Pedido + Stock Reconciliation) */}
      {editingOrder && (
        <div
          onClick={() => setEditingOrder(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in cursor-pointer"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveEditedOrder}
            className="w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#111111]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#111111]">
                    {editingOrder.invoiceNumber
                      ? `Modificar Factura POS ${editingOrder.invoiceNumber}`
                      : `Facturar / Editar Pedido ${editingOrder.orderNumber}`}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Cualquier cambio en prendas o cantidades ajusta el inventario automáticamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#111111] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Customer & Shipping Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Cédula / NIT</label>
                  <input
                    type="text"
                    value={editDoc}
                    onChange={(e) => setEditDoc(e.target.value)}
                    placeholder="222222222222"
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editTel}
                    onChange={(e) => setEditTel(e.target.value)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">
                    Dirección de Entrega (Cartagena / Nacional)
                  </label>
                  <input
                    type="text"
                    required
                    value={editDir}
                    onChange={(e) => setEditDir(e.target.value)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Transportadora</label>
                  <input
                    type="text"
                    value={editTransportadora}
                    onChange={(e) => setEditTransportadora(e.target.value)}
                    placeholder="Ej. Coordinadora / Domicilio Cartagena"
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Guía de Despacho</label>
                  <input
                    type="text"
                    value={editGuia}
                    onChange={(e) => setEditGuia(e.target.value)}
                    placeholder="Ej. CTG-884120"
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-mono"
                  />
                </div>
              </div>

              {/* Edit Line Items */}
              <div className="bg-[#F5F5F7] rounded-2xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#111111]">
                    Prendas en la Factura ({editItems.reduce((a, b) => a + b.cantidad, 0)} un.)
                  </span>

                  {/* Add another product to this invoice */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={editAddProductId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setEditAddProductId(pid);
                        const p = products.find((x) => x.id === pid);
                        if (p && p.variantes[0]) {
                          setEditAddVariantId(p.variantes[0].id_variante);
                        }
                      }}
                      className="bg-white rounded-lg px-2 py-1 text-[11px]"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>

                    <select
                      value={editAddVariantId}
                      onChange={(e) => setEditAddVariantId(e.target.value)}
                      className="bg-white rounded-lg px-2 py-1 text-[11px]"
                    >
                      {(products.find((p) => p.id === editAddProductId)?.variantes || []).map(
                        (v) => (
                          <option key={v.id_variante} value={v.id_variante}>
                            Talla {v.talla} · {v.color} ({v.stock_disponible})
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddLineToEditOrder}
                      className="px-2.5 py-1 rounded-lg bg-[#111111] text-white text-[11px] font-bold"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {editItems.map((it) => (
                    <div
                      key={it.cartItemId}
                      className="bg-white rounded-xl p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={it.imagen}
                          alt={it.nombre}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-lg object-cover bg-[#F5F5F7]"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[#111111] truncate">{it.nombre}</p>
                          <p className="text-[11px] text-zinc-500">
                            Talla {it.talla} · {it.color} · {formatCOP(it.precio)} c/u
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#F5F5F7] rounded-full px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setEditItems(
                                editItems
                                  .map((x) =>
                                    x.cartItemId === it.cartItemId
                                      ? { ...x, cantidad: x.cantidad - 1 }
                                      : x
                                  )
                                  .filter((x) => x.cantidad > 0)
                              )
                            }
                            className="w-5 h-5 font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-bold">
                            {it.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditItems(
                                editItems.map((x) =>
                                  x.cartItemId === it.cartItemId
                                    ? { ...x, cantidad: x.cantidad + 1 }
                                    : x
                                )
                              )
                            }
                            className="w-5 h-5 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-bold tabular-nums w-20 text-right">
                          {formatCOP(it.precio * it.cantidad)}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setEditItems(
                              editItems.filter((x) => x.cartItemId !== it.cartItemId)
                            )
                          }
                          className="text-zinc-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment, Status & Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Estado</label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value as EstadoPedido)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2.5 font-bold text-[#111111]"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Facturado">Facturado</option>
                    <option value="Despachado">Despachado (Push 🔔)</option>
                    <option value="Entregado">Entregado (Push 🔔)</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Medio de Pago</label>
                  <select
                    value={editMetodoPago}
                    onChange={(e) => setEditMetodoPago(e.target.value as MetodoPagoInterno)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2.5 text-[#111111]"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia / Nequi">Transferencia / Nequi</option>
                    <option value="Tarjeta / Datáfono">Tarjeta / Datáfono</option>
                    <option value="Contraentrega">Contraentrega</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Envío ($ COP)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editEnvio}
                    onChange={(e) => setEditEnvio(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2.5 text-[#111111] font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Descuento ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editDescuento}
                    onChange={(e) => setEditDescuento(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2.5 text-[#111111] font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F5F5F7] flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Total Liquidado Factura:</span>
                <span className="text-base font-extrabold text-[#111111] tabular-nums">
                  {formatCOP(
                    Math.max(
                      0,
                      editItems.reduce((a, b) => a + b.precio * b.cantidad, 0) +
                        (Number(editEnvio) || 0) -
                        (Number(editDescuento) || 0)
                    )
                  )}
                </span>
              </div>

              {editError && <p className="text-xs text-red-600 font-semibold">{editError}</p>}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="w-1/3 py-3 rounded-full bg-[#F5F5F7] text-xs font-bold text-[#111111]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 rounded-full bg-[#111111] text-white font-bold text-xs"
              >
                Guardar Cambios en Factura
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: DELETE INVOICE CONFIRMATION */}
      {orderToDelete && (
        <div
          onClick={() => setOrderToDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl p-6 space-y-4 shadow-2xl text-center cursor-default"
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#111111]">
                ¿Eliminar {orderToDelete.invoiceNumber || orderToDelete.orderNumber}?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Esta acción eliminará el registro del sistema POS y restituirá automáticamente las unidades descontadas al inventario de Cartagena.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="w-1/2 py-3 rounded-full bg-[#F5F5F7] text-xs font-bold text-[#111111]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="w-1/2 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE / EDIT PRODUCT WITH PHOTO UPLOAD & VARIANTS */}
      {showProductModal && (
        <div
          onClick={() => setShowProductModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in cursor-pointer"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveProductModal}
            className="w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#111111]">
                  {editingProductId
                    ? 'Editar Producto y Fotografía POS'
                    : 'Crear Nuevo Producto en Inventario POS'}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Sube una fotografía desde tu dispositivo o ingresa una URL y configura las tallas y colores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#111111] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Photo Upload + Preview Section */}
              <div className="bg-[#F5F5F7] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white border border-zinc-200 shrink-0">
                  <img
                    src={
                      prodImagenUrl ||
                      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85'
                    }
                    alt="Vista previa"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 w-full space-y-2">
                  <label className="text-xs font-bold text-[#111111] block">
                    Fotografía del Producto
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-4 py-2 rounded-full bg-[#111111] text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-zinc-800 transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto desde Dispositivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-zinc-400">o pegar URL de imagen:</span>
                  </div>
                  <input
                    type="text"
                    value={prodImagenUrl}
                    onChange={(e) => setProdImagenUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-white rounded-xl px-3 py-2 text-xs text-[#111111]"
                  />
                </div>
              </div>

              {/* Product Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Código Referencia</label>
                  <input
                    type="text"
                    value={prodReferencia}
                    onChange={(e) => setProdReferencia(e.target.value)}
                    placeholder="REF-CAM-07"
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-zinc-500 block mb-1">
                    Nombre Comercial del Producto
                  </label>
                  <input
                    type="text"
                    required
                    value={prodNombre}
                    onChange={(e) => setProdNombre(e.target.value)}
                    placeholder="Ej. Camiseta Algodón Egipcio Cartagena"
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Categoría</label>
                  <select
                    value={prodCategoria}
                    onChange={(e) =>
                      setProdCategoria(
                        e.target.value as 'Camisetas' | 'Bolsos' | 'Chanclas'
                      )
                    }
                    className="w-full bg-[#F5F5F7] rounded-xl px-2.5 py-2 font-bold text-[#111111]"
                  >
                    <option value="Camisetas">Camisetas</option>
                    <option value="Bolsos">Bolsos</option>
                    <option value="Chanclas">Chanclas</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Línea / Colección</label>
                  <input
                    type="text"
                    value={prodMarca}
                    onChange={(e) => setProdMarca(e.target.value)}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">
                    Precio Base ($ COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={prodPrecio}
                    onChange={(e) => setProdPrecio(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-mono font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">Alerta Stock Mín.</label>
                  <input
                    type="number"
                    min={1}
                    value={prodAlertaMin}
                    onChange={(e) => setProdAlertaMin(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={prodDescripcion}
                  onChange={(e) => setProdDescripcion(e.target.value)}
                  className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              {/* Variants Builder inside Product Modal */}
              <div className="bg-[#F5F5F7] rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111111]">
                    Matriz de Variantes (Tallas, Colores y Stock)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setProdVariantes([
                        ...prodVariantes,
                        {
                          id_variante: `var-${prodReferencia || 'item'}-${prodVariantes.length + 1}`,
                          sku: `SKU-${String(prodVariantes.length + 1).padStart(3, '0')}`,
                          talla: prodCategoria === 'Chanclas' ? '40' : 'L',
                          color: 'Negro Mate',
                          diseno_motivo: 'Edición Oficial',
                          stock_disponible: 8,
                        },
                      ])
                    }
                    className="px-3 py-1 rounded-full bg-[#111111] text-white text-[11px] font-bold"
                  >
                    + Añadir Variante
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {prodVariantes.map((v, idx) => (
                    <div
                      key={v.id_variante}
                      className="grid grid-cols-12 gap-1.5 bg-white p-2 rounded-xl items-center"
                    >
                      <input
                        type="text"
                        value={v.sku || ''}
                        onChange={(e) => {
                          const next = [...prodVariantes];
                          next[idx] = { ...v, sku: e.target.value };
                          setProdVariantes(next);
                        }}
                        placeholder="SKU"
                        className="col-span-3 bg-[#F5F5F7] rounded-lg px-2 py-1.5 font-mono text-[11px]"
                      />
                      <input
                        type="text"
                        value={v.talla}
                        onChange={(e) => {
                          const next = [...prodVariantes];
                          next[idx] = { ...v, talla: e.target.value };
                          setProdVariantes(next);
                        }}
                        placeholder="Talla"
                        className="col-span-2 bg-[#F5F5F7] rounded-lg px-2 py-1.5 font-bold text-center"
                      />
                      <input
                        type="text"
                        value={v.color}
                        onChange={(e) => {
                          const next = [...prodVariantes];
                          next[idx] = { ...v, color: e.target.value };
                          setProdVariantes(next);
                        }}
                        placeholder="Color"
                        className="col-span-3 bg-[#F5F5F7] rounded-lg px-2 py-1.5"
                      />
                      <input
                        type="number"
                        min={0}
                        value={v.stock_disponible}
                        onChange={(e) => {
                          const next = [...prodVariantes];
                          next[idx] = {
                            ...v,
                            stock_disponible: Math.max(0, Number(e.target.value)),
                          };
                          setProdVariantes(next);
                        }}
                        placeholder="Stock"
                        className="col-span-3 bg-[#F5F5F7] rounded-lg px-2 py-1.5 font-mono font-bold text-center"
                      />
                      <button
                        type="button"
                        disabled={prodVariantes.length <= 1}
                        onClick={() =>
                          setProdVariantes(
                            prodVariantes.filter((x) => x.id_variante !== v.id_variante)
                          )
                        }
                        className="col-span-1 text-zinc-400 hover:text-red-600 flex justify-center disabled:opacity-25"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {prodModalError && (
                <p className="text-xs text-red-600 font-semibold">{prodModalError}</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="w-1/3 py-3 rounded-full bg-[#F5F5F7] text-xs font-bold text-[#111111]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 rounded-full bg-[#111111] text-white font-bold text-xs"
              >
                {editingProductId ? 'Guardar Cambios del Producto' : 'Crear Producto en Inventario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: DELETE PRODUCT CONFIRMATION */}
      {productToDelete && (
        <div
          onClick={() => setProductToDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl p-6 space-y-4 shadow-2xl text-center cursor-default"
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#111111]">
                ¿Eliminar &ldquo;{productToDelete.nombre}&rdquo;?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                El producto y sus variantes se retirarán del catálogo público y del terminal POS.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="w-1/2 py-3 rounded-full bg-[#F5F5F7] text-xs font-bold text-[#111111]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="w-1/2 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Eliminar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Invoice Preview Modal */}
      {selectedOrderForInvoice && (
        <DigitalInvoiceModal
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}
    </div>
  );
}
