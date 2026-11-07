'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { Producto, Variante, formatCOP } from '@/lib/data';
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
  ArrowLeft,
  Receipt,
  Trash2,
  Search,
  X,
  Pencil,
  Upload,
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
  const [adminToastMsg, setAdminToastMsg] = useState<string | null>(null);

  // Product Create / Edit Modal with Photos, COGS & IVA State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodReferencia, setProdReferencia] = useState('');
  const [prodNombre, setProdNombre] = useState('');
  const [prodCategoria, setProdCategoria] = useState<'Camisetas' | 'Bolsos' | 'Chanclas'>(
    'Camisetas'
  );
  const [prodMarca, setProdMarca] = useState('');
  const [prodPrecio, setProdPrecio] = useState<number>(95000);
  const [prodCostoUnitario, setProdCostoUnitario] = useState<number>(42000);
  const [prodIvaPorcentaje, setProdIvaPorcentaje] = useState<number>(19);
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

  // Open Product Create / Edit Modal with Photos, COGS & IVA
  const openCreateProductModal = () => {
    const nextNum = String(products.length + 1).padStart(3, '0');
    setEditingProductId(null);
    setProdReferencia(`REF-${nextNum}`);
    setProdNombre('');
    setProdCategoria('Camisetas');
    setProdMarca('Colección Cartagena');
    setProdPrecio(95000);
    setProdCostoUnitario(42000);
    setProdIvaPorcentaje(19);
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
    setProdCostoUnitario(prod.costo_unitario ?? Math.round(prod.precio_base * 0.45));
    setProdIvaPorcentaje(prod.iva_porcentaje ?? 19);
    setProdAlertaMin(prod.configuracion_alertas?.stock_minimo_alerta ?? 4);
    setProdDescripcion(prod.descripcion);
    setProdImagenUrl(prod.imagenes[0] || '');
    setProdVariantes(structuredClone(prod.variantes));
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
      costo_unitario: Math.max(0, Number(prodCostoUnitario) || 0),
      iva_porcentaje: Math.max(0, Number(prodIvaPorcentaje ?? 19)),
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

  const totalFacturado = orders
    .filter(
      (o) =>
        o.estado === 'Facturado' || o.estado === 'Despachado' || o.estado === 'Entregado'
    )
    .reduce((sum, o) => sum + o.total, 0);

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
      storeName: newStoreName.trim() || 'La Santa Store',
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
                  Consola Administrativa POS & ERP · Cartagena
                </h1>
                <p className="text-[11px] text-zinc-500 hidden sm:block">
                  Facturación POS · Inventario Kardex · Notificaciones Push · Plugins API
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

      {/* Auth Gate: PIN Screen */}
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
                Acceso al Sistema POS & ERP
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
                  Código PIN inválido o acceso bloqueado temporalmente por intentos fallidos.
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

          {/* TAB 1: TERMINAL DE FACTURACIÓN POS PROFESIONAL & DESPACHOS (Única fuente de verdad: POSDashboard) */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <POSDashboard />
            </div>
          )}

          {/* TAB 2: SISTEMA DE INVENTARIO POS PROFESIONAL CON FOTOS, COGS & MARGEN */}
          {activeTab === 'inventory' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F5F5F7] p-4 rounded-3xl">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#111111]">
                    Gestión de Inventario POS con Fotografías, Costo Unitario e IVA
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Crea prendas con compresión WebP automática, administra costo unitario (COGS), IVA y existencias por talla en tiempo real.
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
                        Las unidades se descuentan automáticamente al emitir facturas y se reintegran mediante Nota Crédito en caso de anulación.
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
                  const unitCost = prod.costo_unitario ?? Math.round(prod.precio_base * 0.45);
                  const marginPct =
                    prod.precio_base > 0
                      ? Math.round(((prod.precio_base - unitCost) / prod.precio_base) * 100)
                      : 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-[#F5F5F7] rounded-3xl p-4 sm:p-5 space-y-4"
                    >
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
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-sm font-extrabold text-[#111111] tabular-nums">
                                {formatCOP(prod.precio_base)}
                              </span>
                              <span className="text-[11px] text-zinc-500 font-mono">
                                Costo: {formatCOP(unitCost)} · Margen: {marginPct}% · IVA:{' '}
                                {prod.iva_porcentaje ?? 19}%
                              </span>
                            </div>
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
                    El backend de la tienda opera sobre controladores REST transaccionales con persistencia MySQL (<code>/api/store</code>, <code>/api/products</code>, <code>/api/orders</code>, <code>/api/plugins</code> y <code>/api/webhooks</code>) preparados para activar pasarelas de pago y transportadoras.
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

          {/* TAB 4: MÉTRICAS Y REPORTES FINANCIEROS (CON COSTO COGS Y UTILIDAD BRUTA) */}
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
                  Valoración Contable de Inventario por Referencia (PVP vs. Costo COGS)
                </h4>
                <div className="space-y-2.5 text-xs">
                  {products.map((p, idx) => {
                    const totalStock = p.variantes.reduce((s, v) => s + v.stock_disponible, 0);
                    const unitCost = p.costo_unitario ?? Math.round(p.precio_base * 0.45);
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
                              {p.referencia || p.id} · {p.categoria} · Costo u.:{' '}
                              {formatCOP(unitCost)} · IVA {p.iva_porcentaje ?? 19}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#111111] tabular-nums">
                            {formatCOP(p.precio_base * totalStock)} PVP ({totalStock} un.)
                          </p>
                          <p className="text-[11px] text-zinc-500 tabular-nums">
                            Costo Bodega: {formatCOP(unitCost * totalStock)} · Utilidad pot.:{' '}
                            {formatCOP((p.precio_base - unitCost) * totalStock)}
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
                      ✓ Configuración sincronizada en servidor MySQL
                    </span>
                  )}
                </div>
              </form>

              <div className="bg-[#F5F5F7] rounded-3xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-sm font-extrabold text-[#111111]">
                    Restauración de Catálogo Base
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Si deseas reiniciar las pruebas de inventario, facturación POS y notificaciones push a su estado limpio inicial en Cartagena de Indias, puedes restablecer la base de datos del servidor.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
                  {resetSuccess ? (
                    <span className="text-xs text-[#111111] font-semibold">
                      ✓ Catálogo y facturas reiniciados
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-500">Sincronizado con MySQL Hostinger</span>
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

      {/* MODAL: CREATE / EDIT PRODUCT WITH PHOTO UPLOAD, COGS, IVA & VARIANTS */}
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
                    ? 'Editar Producto, Costo COGS y Fotografía POS'
                    : 'Crear Nuevo Producto en Inventario POS'}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Las fotografías se comprimen automáticamente a formato WebP ligero (~45 KB) antes de guardarse en la base de datos.
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
                    Fotografía del Producto (Compresión WebP Automática)
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">
                    Precio Venta PVP ($ COP)
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
                  <label className="text-[11px] text-zinc-500 block mb-1">
                    Costo Unitario COGS ($ COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={prodCostoUnitario}
                    onChange={(e) => setProdCostoUnitario(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F5F5F7] rounded-xl px-3 py-2 text-[#111111] font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1">
                    Impuesto IVA (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={35}
                    value={prodIvaPorcentaje}
                    onChange={(e) => setProdIvaPorcentaje(Math.max(0, Number(e.target.value)))}
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

      {/* MODAL: DELETE PRODUCT CONFIRMATION */}
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
    </div>
  );
}
