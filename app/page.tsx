'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { Producto, formatCOP } from '@/lib/data';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { CartDrawer } from '@/components/CartDrawer';
import { StoreFooter, CookieConsentBanner } from '@/components/FooterAndCookies';
import {
  ShoppingBag,
  SlidersHorizontal,
  Search,
  X,
  WifiOff,
  Home as HomeIcon,
  Heart,
  MessageCircle,
  Sparkles,
  Check,
  ArrowUpDown,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const {
    products,
    favorites,
    cartTotalCount,
    cartSubtotal,
    storeConfig,
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

  // Featured product for the editorial Hero card
  const featuredHeroProduct = products[0];

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
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </section>

        {/* Clean Editorial Minimal Streetwear Hero Card (1:1 Dribbble #27573251) */}
        {activeNavTab === 'home' && !searchQuery && (
          <section className="relative overflow-hidden rounded-[28px] bg-[#F5F5F7] p-6 sm:p-8 flex items-center justify-between gap-6 border border-zinc-200/70">
            <div className="relative z-10 max-w-md space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#111111] text-[11px] font-bold tracking-wide shadow-2xs">
                <Sparkles className="w-3 h-3 text-[#111111]" />
                <span>Nueva Colección</span>
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] leading-[1.15]">
                Moda Urbana &amp; Esenciales Contemporáneos.
              </h1>

              <p className="text-xs text-zinc-500 font-medium leading-relaxed line-clamp-2">
                Camisetas Oversize, Bolsos Tote y Chanclas Slides con disponibilidad inmediata y envíos a todo el país.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (featuredHeroProduct) {
                      setSelectedProduct(featuredHeroProduct);
                    } else {
                      setShowOnboardingScreen(true);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition active:scale-95 inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>Ver Colección</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppDirect()}
                  className="px-4 py-2.5 rounded-full bg-white text-[#111111] text-xs font-semibold hover:bg-zinc-100 border border-zinc-200/80 transition active:scale-95 inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Asesoría WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Clean Cutout / Editorial Product Preview */}
            {!isHydrated ? (
              <div className="hidden sm:flex items-center gap-3 bg-white p-3 rounded-[24px] shadow-sm border border-zinc-100 shrink-0">
                <div className="w-24 h-28 rounded-2xl bg-[#F5F5F7] animate-pulse shrink-0" />
                <div className="pr-2 space-y-2 w-28">
                  <div className="h-2.5 w-14 bg-[#F5F5F7] rounded animate-pulse" />
                  <div className="h-3.5 w-24 bg-[#F5F5F7] rounded animate-pulse" />
                  <div className="h-3.5 w-16 bg-[#F5F5F7] rounded animate-pulse" />
                </div>
              </div>
            ) : featuredHeroProduct ? (
              <div
                onClick={() => setSelectedProduct(featuredHeroProduct)}
                className="hidden sm:flex items-center gap-3 bg-white p-3 rounded-[24px] shadow-sm border border-zinc-100 cursor-pointer group shrink-0 hover:shadow-md transition"
              >
                <div className="relative w-24 h-28 rounded-2xl overflow-hidden bg-[#F5F5F7] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      featuredHeroProduct.imagenes[0] ||
                      '/assets/brand/logo-la-santa.png'
                    }
                    alt={featuredHeroProduct.nombre}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="pr-2 space-y-1 max-w-[140px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Destacado
                  </span>
                  <p className="text-xs font-bold text-[#111111] line-clamp-2 leading-snug">
                    {featuredHeroProduct.nombre}
                  </p>
                  <p className="text-xs font-extrabold text-[#111111] pt-0.5">
                    {formatCOP(featuredHeroProduct.precio_base)}
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* Horizontal Category Pills (1:1 Dribbble #27573251) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111111]">
              {activeNavTab === 'favorites' ? 'Mis Favoritos' : 'Categorías'}
            </h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-zinc-500 hover:text-[#111111] transition"
              >
                Ver todo
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {(
              [
                { id: 'Todos', label: 'Todo' },
                { id: 'Camisetas', label: 'Camisetas' },
                { id: 'Bolsos', label: 'Bolsos' },
                { id: 'Chanclas', label: 'Chanclas' },
              ] as const
            ).map((cat) => {
              const isSelected = selectedCategory === cat.id && activeNavTab === 'home';
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveNavTab('home');
                    setSelectedCategory(cat.id);
                    setSelectedSizeFilter('Todas');
                    setSelectedColorFilter('Todos');
                  }}
                  className={`px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-[#111111] text-white shadow-xs'
                      : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Active Sub-filters Pills */}
          {(selectedSizeFilter !== 'Todas' ||
            selectedColorFilter !== 'Todos' ||
            sortByPrice !== 'relevancia' ||
            onlyInStock) && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {selectedSizeFilter !== 'Todas' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] text-xs font-semibold text-[#111111]">
                  Talla: {selectedSizeFilter}
                  <button
                    type="button"
                    onClick={() => setSelectedSizeFilter('Todas')}
                    aria-label="Quitar filtro de talla"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedColorFilter !== 'Todos' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] text-xs font-semibold text-[#111111]">
                  Color: {selectedColorFilter}
                  <button
                    type="button"
                    onClick={() => setSelectedColorFilter('Todos')}
                    aria-label="Quitar filtro de color"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {sortByPrice !== 'relevancia' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] text-xs font-semibold text-[#111111]">
                  {sortByPrice === 'precio_asc' ? 'Menor a mayor precio' : 'Mayor a menor precio'}
                  <button
                    type="button"
                    onClick={() => setSortByPrice('relevancia')}
                    aria-label="Quitar orden de precio"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {onlyInStock && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F7] text-xs font-semibold text-[#111111]">
                  Solo con stock
                  <button
                    type="button"
                    onClick={() => setOnlyInStock(false)}
                    aria-label="Quitar filtro de stock"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </section>

        {/* Product Grid (2 Columns on Mobile like Dribbble #27573251, 3 on Desktop) */}
        <section>
          {!isHydrated ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="space-y-3">
                  <div className="aspect-[4/5] rounded-[28px] bg-[#F5F5F7] animate-pulse" />
                  <div className="h-4 w-2/3 bg-[#F5F5F7] rounded animate-pulse" />
                  <div className="h-4 w-1/3 bg-[#F5F5F7] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-[28px] bg-[#F5F5F7] p-12 text-center max-w-md mx-auto my-4">
              <p className="text-base font-bold text-[#111111] mb-1">
                {activeNavTab === 'favorites'
                  ? 'Aún no tienes prendas favoritas'
                  : 'Sin resultados para esta búsqueda'}
              </p>
              <p className="text-xs text-zinc-500 mb-5">
                {activeNavTab === 'favorites'
                  ? 'Toca el corazón en cualquier camiseta, bolso o chancla para guardarla aquí.'
                  : 'Prueba limpiando los filtros o seleccionando otra categoría.'}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="px-6 py-2.5 rounded-full bg-[#111111] text-white font-semibold text-xs hover:bg-zinc-800 transition"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-7">
              {filteredProducts.map((producto) => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  onSelect={(prod) => setSelectedProduct(prod)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Downbar Footer (100% Real Policies, Cartagena Base & HomeLab copyright) */}
      <StoreFooter />

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />

      {/* Shopper-Only Floating Bottom Pill Navigation Dock (1:1 Dribbble #27573251) */}
      <div className="fixed bottom-5 left-0 right-0 z-30 px-4 pointer-events-none">
        <div className="max-w-md mx-auto bg-[#111111]/95 backdrop-blur-xl text-white rounded-full p-2 shadow-2xl pointer-events-auto flex items-center justify-between border border-white/10">
          {/* Home Tab */}
          <button
            type="button"
            onClick={() => setActiveNavTab('home')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition ${
              activeNavTab === 'home'
                ? 'bg-white text-[#111111]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            <span>Inicio</span>
          </button>

          {/* Favorites Tab */}
          <button
            type="button"
            onClick={() => setActiveNavTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition relative ${
              activeNavTab === 'favorites'
                ? 'bg-white text-[#111111]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Favoritos</span>
            {favorites.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </button>

          {/* Bag / Cart Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white transition relative"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>
              {cartTotalCount > 0 ? formatCOP(cartSubtotal) : 'Bolsa'}
            </span>
            {cartTotalCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-[#111111] text-[10px] font-bold flex items-center justify-center">
                {cartTotalCount}
              </span>
            )}
          </button>

          {/* Direct WhatsApp Support Button */}
          <button
            type="button"
            onClick={() => handleOpenWhatsAppDirect()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white transition relative"
            title="Atención directa por WhatsApp"
            aria-label="Contactar por WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Onboarding / Season Presentation Modal */}
      {showOnboardingScreen && (
        <div
          onClick={() => setShowOnboardingScreen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white rounded-[36px] p-5 shadow-2xl overflow-hidden flex flex-col gap-5 cursor-default"
          >
            <div className="relative aspect-[4/4] w-full rounded-[28px] overflow-hidden bg-[#F5F5F7]">
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
                Diseño Contemporáneo &amp; Distribución Nacional
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

      {/* Cart Drawer with WhatsApp checkout & Shipping Selector */}
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
            className="w-full max-w-lg sm:max-w-xl bg-white rounded-[36px] p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#111111]">
                  Filtros de Tienda
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Filtra por categoría, talla disponible, color y orden de precio
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFiltersModal(false)}
                className="w-10 h-10 rounded-full bg-[#F5F5F7] text-[#111111] flex items-center justify-center hover:bg-zinc-200 transition"
                aria-label="Cerrar filtros"
              >
                <X className="w-5 h-5" />
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
