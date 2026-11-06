'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { Producto, formatCOP } from '@/lib/data';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { CartDrawer } from '@/components/CartDrawer';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { StoreFooter, CookieConsentBanner } from '@/components/FooterAndCookies';
import {
  ShoppingBag,
  SlidersHorizontal,
  Search,
  X,
  WifiOff,
  Home as HomeIcon,
  Heart,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  Check,
  ArrowUpDown,
} from 'lucide-react';

export default function Home() {
  const {
    products,
    favorites,
    cartTotalCount,
    cartSubtotal,
    storeConfig,
    criticalAlerts,
    isHydrated,
  } = useStore();

  // Navigation tab ('home' | 'favorites')
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'favorites'>('home');

  // Full-screen Season Presentation Modal
  const [showOnboardingScreen, setShowOnboardingScreen] = useState(false);

  // Search and Store Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'Todos' | 'Camisetas' | 'Bolsos' | 'Chanclas'
  >('Todos');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('Todas');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('Todos');
  const [sortByPrice, setSortByPrice] = useState<'relevancia' | 'precio_asc' | 'precio_desc'>(
    'relevancia'
  );
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  // Online / Offline state using useSyncExternalStore
  const isOnline = React.useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,
    () => true
  );

  // Dynamic filter options scoped to the selected category (store logic)
  const categoryScopedProducts = useMemo(() => {
    if (selectedCategory === 'Todos') return products;
    return products.filter((p) => p.categoria === selectedCategory);
  }, [products, selectedCategory]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    categoryScopedProducts.forEach((p) => p.variantes.forEach((v) => set.add(v.talla)));
    return Array.from(set);
  }, [categoryScopedProducts]);

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    categoryScopedProducts.forEach((p) => p.variantes.forEach((v) => set.add(v.color)));
    return Array.from(set);
  }, [categoryScopedProducts]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (activeNavTab === 'favorites' && !favorites.includes(p.id)) {
        return false;
      }

      if (selectedCategory !== 'Todos' && p.categoria !== selectedCategory) {
        return false;
      }

      if (onlyInStock) {
        const totalStock = p.variantes.reduce((acc, v) => acc + v.stock_disponible, 0);
        if (totalStock <= 0) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.nombre.toLowerCase().includes(q);
        const matchesBrand = p.marca_motivo.toLowerCase().includes(q);
        const matchesCategory = p.categoria.toLowerCase().includes(q);
        const matchesVariants = p.variantes.some(
          (v) =>
            v.talla.toLowerCase().includes(q) ||
            v.color.toLowerCase().includes(q) ||
            v.diseno_motivo.toLowerCase().includes(q)
        );

        if (!matchesName && !matchesBrand && !matchesCategory && !matchesVariants) {
          return false;
        }
      }

      if (selectedSizeFilter !== 'Todas') {
        const hasSize = p.variantes.some(
          (v) => v.talla === selectedSizeFilter && v.stock_disponible > 0
        );
        if (!hasSize) return false;
      }

      if (selectedColorFilter !== 'Todos') {
        const hasColor = p.variantes.some(
          (v) => v.color === selectedColorFilter && v.stock_disponible > 0
        );
        if (!hasColor) return false;
      }

      return true;
    });

    if (sortByPrice === 'precio_asc') {
      return [...filtered].sort((a, b) => a.precio_base - b.precio_base);
    }
    if (sortByPrice === 'precio_desc') {
      return [...filtered].sort((a, b) => b.precio_base - a.precio_base);
    }
    return filtered;
  }, [
    products,
    activeNavTab,
    favorites,
    selectedCategory,
    onlyInStock,
    searchQuery,
    selectedSizeFilter,
    selectedColorFilter,
    sortByPrice,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'Todos') count++;
    if (selectedSizeFilter !== 'Todas') count++;
    if (selectedColorFilter !== 'Todos') count++;
    if (sortByPrice !== 'relevancia') count++;
    if (onlyInStock) count++;
    return count;
  }, [selectedCategory, selectedSizeFilter, selectedColorFilter, sortByPrice, onlyInStock]);

  const hasActiveFilters =
    activeFilterCount > 0 || searchQuery !== '' || activeNavTab === 'favorites';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todos');
    setSelectedSizeFilter('Todas');
    setSelectedColorFilter('Todos');
    setSortByPrice('relevancia');
    setOnlyInStock(false);
    setActiveNavTab('home');
  };

  const handleOpenWhatsAppDirect = (customMessage?: string) => {
    const cleanPhone = (storeConfig.storePhone || '573105559876').replace(/\D/g, '');
    const text =
      customMessage ||
      `Hola ${storeConfig.storeName} (${storeConfig.storeCity}), estoy visitando la tienda y me gustaría recibir asesoría sobre las prendas disponibles.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col selection:bg-[#111111] selection:text-white">
      {/* Offline Toast */}
      {mounted && !isOnline && (
        <div className="bg-[#111111] text-white px-4 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 z-40 sticky top-0">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Sin Conexión · El catálogo y tu carrito están guardados localmente</span>
        </div>
      )}

      {/* Minimalist App Profile Header (1:1 Dribbble #27573251 - With La Santa Store) */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
        activeNavTab={activeNavTab}
        setActiveNavTab={setActiveNavTab}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Main Mobile Marketplace Container */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-3 space-y-6 flex-1">
        {/* Search Bar + 100% Functional Store Filter Button (1:1 Dribbble #27573251) */}
        <section className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar camisetas, bolsos, chanclas o tallas..."
              aria-label="Buscar prendas en la tienda"
              className="w-full h-12 bg-[#F5F5F7] text-sm text-[#111111] placeholder-zinc-400 pl-11 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-[#111111]/15 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#111111]"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFiltersModal(true)}
            className="w-12 h-12 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0 transition active:scale-95 hover:bg-zinc-800 relative"
            aria-label="Filtrar por categoría, talla, color y precio"
            title="Filtros de Tienda (Camisetas, Bolsos, Chanclas, Tallas y Precios)"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#111111] border border-[#111111] text-[10px] font-black flex items-center justify-center tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </section>

        {/* Promotional Season Banner with Colorful High-Impact Background Image that Pops Amongst Minimalism */}
        {activeNavTab === 'home' && !searchQuery && (
          <section className="relative rounded-[32px] overflow-hidden p-6 sm:p-9 shadow-lg">
            {/* Colorful Vibrant Background Image */}
            <div className="absolute inset-0 z-0">
              <Image
                src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=85"
                alt="Fondo Colorido Temporada La Santa"
                fill
                priority
                className="object-cover object-center scale-105"
                referrerPolicy="no-referrer"
              />
              {/* Refined gradient overlay for text legibility while retaining vibrant colorful pops */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/35 backdrop-blur-[1px]" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3 text-left max-w-lg">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black text-white border border-white/30 tracking-wide uppercase">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Temporada 2026 · Cartagena de Indias</span>
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                  Edición Especial & Colores Vibrantes
                </h1>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed drop-shadow-xs max-w-md">
                  {storeConfig.corporateTagline}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenWhatsAppDirect(
                        `Hola ${storeConfig.storeName}, quiero aprovechar la Promoción de Temporada 2026 desde ${storeConfig.storeCity}. ¿Me brindas información de prendas disponibles?`
                      )
                    }
                    className="px-5 py-3 rounded-full bg-white text-[#111111] font-black text-xs flex items-center gap-2 hover:bg-zinc-100 transition active:scale-95 shadow-md"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Pedir por WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOnboardingScreen(true)}
                    className="px-4 py-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold text-white border border-white/30 transition active:scale-95"
                  >
                    Ver Destacados
                  </button>
                </div>
              </div>

              <div className="relative w-full sm:w-48 h-48 sm:h-48 rounded-[24px] overflow-hidden bg-white/10 border-2 border-white/40 shadow-xl shrink-0">
                <Image
                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85"
                  alt="Colección La Santa Store"
                  fill
                  className="object-cover"
                  priority
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </section>
        )}

        {/* Horizontal Pill Category Selector (100% Spanish) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              {(['Todos', 'Camisetas', 'Bolsos', 'Chanclas'] as const).map((cat) => {
                const isSelected = activeNavTab === 'home' && selectedCategory === cat;
                const countInCat =
                  cat === 'Todos'
                    ? products.length
                    : products.filter((p) => p.categoria === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveNavTab('home');
                      setSelectedCategory(cat);
                      setSelectedSizeFilter('Todas');
                      setSelectedColorFilter('Todos');
                    }}
                    className={`px-5 py-2.5 rounded-full font-semibold whitespace-nowrap transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
                    }`}
                  >
                    {cat} ({countInCat})
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  setActiveNavTab(activeNavTab === 'favorites' ? 'home' : 'favorites')
                }
                className={`px-5 py-2.5 rounded-full font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeNavTab === 'favorites'
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    activeNavTab === 'favorites' ? 'fill-white text-white' : ''
                  }`}
                />
                <span>Favoritos ({isHydrated ? favorites.length : 0})</span>
              </button>
            </div>
          </div>

          {/* Active Filters Summary Line */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500">
              <span>Mostrando {filteredProducts.length} artículos</span>
              {selectedCategory !== 'Todos' && <span>· Categoría: {selectedCategory}</span>}
              {selectedSizeFilter !== 'Todas' && <span>· Talla: {selectedSizeFilter}</span>}
              {selectedColorFilter !== 'Todos' && <span>· Color: {selectedColorFilter}</span>}
              {onlyInStock && <span>· Solo disponibles</span>}
              {sortByPrice === 'precio_asc' && <span>· Menor a mayor precio</span>}
              {sortByPrice === 'precio_desc' && <span>· Mayor a menor precio</span>}
              <button
                type="button"
                onClick={clearFilters}
                className="text-[#111111] underline font-semibold ml-1"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </section>

        {/* 2-Column Studio Product Grid (1:1 Dribbble #27573251) */}
        <section>
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center bg-[#F5F5F7] rounded-[28px] p-6 space-y-3">
              <Search className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-[#111111]">
                {activeNavTab === 'favorites'
                  ? 'Tu lista de favoritos está vacía'
                  : 'No encontramos artículos con estos filtros'}
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {activeNavTab === 'favorites'
                  ? 'Toca el ícono del corazón en cualquier prenda para guardarla en tu colección.'
                  : 'Prueba seleccionando otra categoría o restablece los filtros de talla y color.'}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="px-6 py-2.5 rounded-full bg-[#111111] text-white font-semibold text-xs"
              >
                Ver Todo el Catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-8">
              {filteredProducts.map((producto) => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  onSelect={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Store Footer with Legal, Policies & HomeLab Credit at the Bottom of the Page */}
      <StoreFooter />

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />

      {/* Floating Matte Black Pill Bottom Navigation Dock (1:1 Dribbble #27573251)
          Actions: Inicio | Favoritos | Carrito | WhatsApp Oficial | Panel Administrativo */}
      <nav
        aria-label="Navegación inferior"
        className="fixed bottom-4 left-0 right-0 z-30 px-4 max-w-sm mx-auto"
      >
        <div className="bg-[#111111] text-white rounded-full p-2 flex items-center justify-between shadow-dock">
          <button
            type="button"
            onClick={() => setActiveNavTab('home')}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
              activeNavTab === 'home'
                ? 'bg-white text-[#111111]'
                : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Inicio"
            title="Inicio"
          >
            <HomeIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveNavTab('favorites')}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
              activeNavTab === 'favorites'
                ? 'bg-white text-[#111111]'
                : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Favoritos"
            title="Favoritos"
          >
            <Heart className="w-4 h-4" />
          </button>

          {/* Center Carrito Button (Renamed from Bag to Carrito) */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="h-11 px-4 rounded-full bg-white text-[#111111] font-bold text-xs flex items-center gap-2 active:scale-95 transition"
            aria-label="Abrir Carrito"
            title="Abrir Carrito"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="tabular-nums">
              {isHydrated && cartTotalCount > 0 ? formatCOP(cartSubtotal) : 'Carrito'}
            </span>
            {isHydrated && cartTotalCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {cartTotalCount}
              </span>
            )}
          </button>

          {/* Functional Direct WhatsApp Oficial Button (Replaces Políticas in Floating Dock) */}
          <button
            type="button"
            onClick={() => handleOpenWhatsAppDirect()}
            className="w-11 h-11 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition"
            aria-label="Contacto directo a WhatsApp Oficial"
            title="Contacto directo a WhatsApp Oficial"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          {/* Primary Entry to Admin Panel (/admin) */}
          <Link
            href="/admin"
            className="relative w-11 h-11 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition"
            aria-label="Panel Administrativo"
            title="Panel Administrativo"
          >
            <ShieldCheck className="w-4 h-4" />
            {criticalAlerts.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Link>
        </div>
      </nav>

      {/* Season Presentation Modal (Closes when clicking outside) */}
      {showOnboardingScreen && (
        <div
          onClick={() => setShowOnboardingScreen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-[36px] p-5 flex flex-col justify-between text-left space-y-5 shadow-2xl cursor-default"
          >
            <div className="relative aspect-[4/5] w-full rounded-[28px] overflow-hidden bg-[#F5F5F7]">
              <Image
                src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85"
                alt="Presentación Promoción de Temporada"
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setShowOnboardingScreen(false)}
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/90 text-[#111111] flex items-center justify-center shadow-sm"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                {storeConfig.storeCity} · Temporada 2026
              </span>
              <h2 className="text-2xl font-bold text-[#111111] leading-tight tracking-tight">
                Diseño Contemporáneo & Distribución Nacional
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {storeConfig.corporateTagline}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowOnboardingScreen(false);
                  handleOpenWhatsAppDirect(
                    `Hola ${storeConfig.storeName}, vi el catálogo de temporada y quiero recibir asesoría para mi pedido.`
                  );
                }}
                className="w-full py-3.5 rounded-full bg-[#111111] hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Consultar Promoción en WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setShowOnboardingScreen(false)}
                className="w-full py-3.5 rounded-full bg-[#F5F5F7] hover:bg-zinc-200 text-[#111111] font-semibold text-xs transition active:scale-95"
              >
                Explorar Catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Product Detail Sheet (Closes when clicking outside) */}
      <ProductDetailModal
        producto={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenCart={() => {
          setSelectedProduct(null);
          setIsCartOpen(true);
        }}
      />

      {/* Cart Drawer with WhatsApp checkout (Closes when clicking outside) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* 100% Functional Store Filter Modal (Categories: Camisetas, Bolsos, Chanclas + Sizes + Colors + Price Sort + Stock) */}
      {showFiltersModal && (
        <div
          onClick={() => setShowFiltersModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-[32px] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  Filtros de Tienda
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Filtra por categoría, talla, color y orden de precio
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#111111] flex items-center justify-center hover:bg-zinc-200 transition"
                aria-label="Cerrar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Categoría de Producto (Camisetas, Bolsos, Chanclas, Todos) */}
            <div>
              <label className="text-xs font-bold text-[#111111] block mb-2.5">
                Categoría de Producto
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Todos', 'Camisetas', 'Bolsos', 'Chanclas'] as const).map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setActiveNavTab('home');
                        setSelectedCategory(cat);
                        setSelectedSizeFilter('Todas');
                        setSelectedColorFilter('Todos');
                      }}
                      className={`py-2.5 px-3 rounded-full text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-[#111111] text-white'
                          : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Ordenar por Precio */}
            <div>
              <label className="text-xs font-bold text-[#111111] flex items-center gap-1.5 mb-2.5">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Ordenar por Precio</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'relevancia', label: 'Destacados' },
                    { id: 'precio_asc', label: 'Menor Precio' },
                    { id: 'precio_desc', label: 'Mayor Precio' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortByPrice(opt.id)}
                    className={`py-2.5 px-2 rounded-full text-xs font-semibold transition ${
                      sortByPrice === opt.id
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Talla Disponible */}
            <div>
              <label className="text-xs font-bold text-[#111111] block mb-2.5">
                Talla Disponible {selectedCategory !== 'Todos' ? `(${selectedCategory})` : ''}
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSizeFilter('Todas')}
                  className={`py-2.5 rounded-full text-xs font-semibold transition ${
                    selectedSizeFilter === 'Todas'
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70'
                  }`}
                >
                  Todas
                </button>
                {availableSizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSizeFilter(sz)}
                    className={`py-2.5 rounded-full text-xs font-semibold transition ${
                      selectedSizeFilter === sz
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Color */}
            <div>
              <label className="text-xs font-bold text-[#111111] block mb-2.5">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedColorFilter('Todos')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                    selectedColorFilter === 'Todos'
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70'
                  }`}
                >
                  Todos
                </button>
                {availableColors.map((clr) => (
                  <button
                    key={clr}
                    type="button"
                    onClick={() => setSelectedColorFilter(clr)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                      selectedColorFilter === clr
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70'
                    }`}
                  >
                    {clr}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Disponibilidad inmediata */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setOnlyInStock(!onlyInStock)}
                className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold transition ${
                  onlyInStock
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70'
                }`}
              >
                <span>Mostrar solo productos con stock disponible</span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    onlyInStock ? 'bg-white text-[#111111]' : 'bg-white border border-zinc-300'
                  }`}
                >
                  {onlyInStock && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
              </button>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={clearFilters}
                className="w-2/5 py-3.5 rounded-full bg-[#F5F5F7] text-xs font-semibold text-[#111111] hover:bg-zinc-200/70"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="w-3/5 py-3.5 rounded-full bg-[#111111] text-white font-semibold text-xs"
              >
                Ver {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
