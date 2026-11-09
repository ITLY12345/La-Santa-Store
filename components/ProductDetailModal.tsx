'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Producto, formatCOP } from '@/lib/data';
import { useStore } from '@/lib/store';
import {
  ArrowLeft,
  Heart,
  Check,
  ShoppingBag,
  AlertCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProductDetailModalProps {
  producto: Producto | null;
  onClose: () => void;
  onOpenCart: () => void;
}

function ProductDetailContent({
  producto,
  onClose,
  onOpenCart,
}: {
  producto: Producto;
  onClose: () => void;
  onOpenCart: () => void;
}) {
  const { addToCart, favorites, toggleFavorite } = useStore();
  const isFavorite = favorites.includes(producto.id);

  const galleryImages = useMemo(() => {
    const valid = (producto.imagenes || []).filter(
      (img) => typeof img === 'string' && img.trim().length > 0
    );
    return valid.length > 0
      ? valid
      : [
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85',
        ];
  }, [producto.imagenes]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const safeImageIdx =
    activeImageIdx < galleryImages.length ? activeImageIdx : 0;
  const activeImg = galleryImages[safeImageIdx];
  const isCustomOrDataImg =
    activeImg.startsWith('data:') ||
    (!activeImg.includes('images.unsplash.com') &&
      !activeImg.includes('picsum.photos'));

  const handlePrevImage = () => {
    setActiveImageIdx(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length
    );
  };

  const handleNextImage = () => {
    setActiveImageIdx((prev) => (prev + 1) % galleryImages.length);
  };

  const initialVariant = useMemo(() => {
    return (
      producto.variantes.find((v) => v.stock_disponible > 0) ||
      producto.variantes[0]
    );
  }, [producto]);

  const allColors = useMemo(() => {
    return Array.from(
      new Set(producto.variantes.map((v) => v.color.trim()).filter(Boolean))
    );
  }, [producto]);

  const [selectedColor, setSelectedColor] = useState<string>(
    initialVariant ? initialVariant.color.trim() : allColors[0] || ''
  );

  const allProductSizes = useMemo(() => {
    return Array.from(
      new Set(producto.variantes.map((v) => v.talla.trim()).filter(Boolean))
    );
  }, [producto]);

  const [selectedTalla, setSelectedTalla] = useState<string>(
    initialVariant ? initialVariant.talla.trim() : allProductSizes[0] || ''
  );

  const [cantidad, setCantidad] = useState<number>(1);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const currentVariant = useMemo(() => {
    const exactMatch = producto.variantes.find(
      (v) =>
        v.color.trim().toLowerCase() === selectedColor.trim().toLowerCase() &&
        v.talla.trim().toLowerCase() === selectedTalla.trim().toLowerCase()
    );
    if (exactMatch) return exactMatch;
    // Fallback if product has a single size/variant under a different color label
    return producto.variantes.find(
      (v) => v.talla.trim().toLowerCase() === selectedTalla.trim().toLowerCase()
    );
  }, [producto, selectedColor, selectedTalla]);

  const stockActual = currentVariant ? currentVariant.stock_disponible : 0;
  const isCurrentCombinationOutOfStock = stockActual <= 0;

  const getStockForSize = (size: string): number => {
    const matching = producto.variantes.filter(
      (item) =>
        item.color.trim().toLowerCase() === selectedColor.trim().toLowerCase() &&
        item.talla.trim().toLowerCase() === size.trim().toLowerCase()
    );
    if (matching.length > 0) {
      return matching.reduce((acc, item) => acc + item.stock_disponible, 0);
    }
    const fallbackBySize = producto.variantes.filter(
      (item) => item.talla.trim().toLowerCase() === size.trim().toLowerCase()
    );
    if (allColors.length <= 1 && fallbackBySize.length > 0) {
      return fallbackBySize.reduce((acc, item) => acc + item.stock_disponible, 0);
    }
    return 0;
  };

  const handleAddToCart = () => {
    if (!currentVariant || isCurrentCombinationOutOfStock) {
      setFeedbackMsg({
        type: 'error',
        text: 'La combinación de talla y color seleccionada no tiene stock disponible.',
      });
      return;
    }

    const result = addToCart({
      productoId: producto.id,
      varianteId: currentVariant.id_variante,
      nombre: producto.nombre,
      categoria: producto.categoria,
      marca_motivo: producto.marca_motivo,
      talla: currentVariant.talla,
      color: currentVariant.color,
      diseno_motivo: currentVariant.diseno_motivo,
      precio: producto.precio_base,
      cantidad,
      stockMaximo: currentVariant.stock_disponible,
      imagen: galleryImages[0],
    });

    if (result.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Agregado al carrito: ${cantidad}x ${producto.nombre} (Talla ${currentVariant.talla})`,
      });
      setTimeout(() => {
        setFeedbackMsg(null);
      }, 3500);
    } else {
      setFeedbackMsg({
        type: 'error',
        text: result.message || 'Error al agregar al carrito.',
      });
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[95vh] md:max-h-[88vh] bg-white border border-zinc-200/80 rounded-t-[36px] sm:rounded-[36px] flex flex-col md:grid md:grid-cols-12 overflow-hidden shadow-2xl cursor-default"
    >
      {/* Left Column / Top Stage: Studio Multi-Photo Showcase */}
      <div className="md:col-span-6 lg:col-span-7 bg-[#F5F5F7] flex flex-col justify-between relative select-none border-b md:border-b-0 md:border-r border-zinc-200/70">
        <div
          className="relative h-80 sm:h-96 md:h-full md:min-h-[480px] w-full overflow-hidden flex items-center justify-center"
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null || galleryImages.length <= 1) return;
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            if (deltaX > 40) handlePrevImage();
            else if (deltaX < -40) handleNextImage();
            setTouchStartX(null);
          }}
        >
          {/* Top Floating Circular White Buttons */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-white/95 hover:bg-white text-[#111111] shadow-md flex items-center justify-center transition active:scale-90"
              aria-label="Cerrar vista de producto"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {galleryImages.length > 1 && (
              <span className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold tabular-nums shadow-sm">
                Foto {safeImageIdx + 1} de {galleryImages.length}
              </span>
            )}

            <button
              type="button"
              onClick={() => toggleFavorite(producto.id)}
              className="w-11 h-11 rounded-full bg-white/95 hover:bg-white text-[#111111] shadow-md flex items-center justify-center transition active:scale-90"
              aria-label="Guardar en favoritos"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#111111]'
                }`}
              />
            </button>
          </div>

          {/* Left / Right Photo Arrows */}
          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                aria-label="Foto anterior"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-[#111111] shadow-lg flex items-center justify-center transition active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                aria-label="Foto siguiente"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-[#111111] shadow-lg flex items-center justify-center transition active:scale-90"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {isCustomOrDataImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImg}
              alt={`${producto.nombre} - Foto ${safeImageIdx + 1}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={activeImg}
              alt={`${producto.nombre} - Foto ${safeImageIdx + 1}`}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Dedicated Interactive Thumbnail Strip inside Gallery Stage */}
        {galleryImages.length > 1 && (
          <div className="p-3.5 sm:p-4 bg-white/90 backdrop-blur-md border-t border-zinc-200/70 flex items-center justify-center gap-2.5 overflow-x-auto scrollbar-none">
            {galleryImages.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                  idx === safeImageIdx
                    ? 'border-[#111111] ring-2 ring-[#111111]/15 scale-105 shadow-sm'
                    : 'border-zinc-200 opacity-65 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt={`Miniatura ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Spacious Product Details & Selection Hierarchy */}
      <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-between max-h-[60vh] md:max-h-[88vh] bg-white overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pt-6 pb-6 space-y-6">
          {/* Category, Brand & Live Stock Badge */}
          <div className="space-y-3 border-b border-zinc-100 pb-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#F5F5F7] text-[#111111] text-xs font-extrabold uppercase tracking-wider">
                  {producto.categoria}
                </span>
                {producto.marca_motivo && (
                  <span className="text-xs font-semibold text-zinc-500">
                    {producto.marca_motivo}
                  </span>
                )}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold tabular-nums ${
                  isCurrentCombinationOutOfStock
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {isCurrentCombinationOutOfStock
                  ? 'Agotado en esta talla'
                  : `${stockActual} disponibles`}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight leading-tight">
              {producto.nombre}
            </h2>

            <div className="flex items-baseline gap-3 pt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-[#111111] tabular-nums">
                {formatCOP(producto.precio_base)}
              </span>
              <span className="text-xs font-semibold text-zinc-400">
                Precio oficial · IVA incluido
              </span>
            </div>

            {producto.descripcion && (
              <p className="text-sm text-zinc-600 leading-relaxed pt-1">
                {producto.descripcion}
              </p>
            )}
          </div>

          {/* 1. Selector de Color */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                1. Color de la Prenda
              </span>
              <span className="text-xs font-bold text-[#111111]">
                {selectedColor}
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {allColors.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color);
                      const hasCurrentSize = producto.variantes.some(
                        (v) =>
                          v.color.trim().toLowerCase() ===
                            color.trim().toLowerCase() &&
                          v.talla.trim().toLowerCase() ===
                            selectedTalla.trim().toLowerCase() &&
                          v.stock_disponible > 0
                      );
                      if (!hasCurrentSize) {
                        const firstAvailableForColor =
                          producto.variantes.find(
                            (v) =>
                              v.color.trim().toLowerCase() ===
                                color.trim().toLowerCase() &&
                              v.stock_disponible > 0
                          ) ||
                          producto.variantes.find(
                            (v) =>
                              v.color.trim().toLowerCase() ===
                              color.trim().toLowerCase()
                          );
                        if (firstAvailableForColor) {
                          setSelectedTalla(firstAvailableForColor.talla.trim());
                        }
                      }
                    }}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#111111] text-white shadow-sm ring-2 ring-[#111111]/15'
                        : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/80'
                    }`}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Selector de Talla */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                2. Selecciona tu Talla
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                Seleccionada:{' '}
                <strong className="text-[#111111] font-extrabold">
                  {selectedTalla}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {allProductSizes.map((talla) => {
                const sizeStock = getStockForSize(talla);
                const isOutOfStock = sizeStock <= 0;
                const isSelected = selectedTalla === talla;

                return (
                  <button
                    key={talla}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      if (!isOutOfStock) {
                        setSelectedTalla(talla);
                        setCantidad(1);
                      }
                    }}
                    className={`py-3.5 px-3 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all border ${
                      isOutOfStock
                        ? 'opacity-45 bg-[#F5F5F7] border-transparent text-zinc-400 cursor-not-allowed line-through'
                        : isSelected
                        ? 'bg-[#111111] border-[#111111] text-white shadow-md scale-[1.02]'
                        : 'bg-[#F5F5F7] border-zinc-200/60 text-[#111111] hover:bg-zinc-200/80 active:scale-95'
                    }`}
                  >
                    <span className="text-sm font-black tracking-tight">
                      {talla}
                    </span>
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        isSelected
                          ? 'text-zinc-300'
                          : isOutOfStock
                          ? 'text-zinc-400'
                          : 'text-zinc-500'
                      }`}
                    >
                      {isOutOfStock ? 'Agotado' : `${sizeStock} disp.`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Cantidad & Disponibilidad */}
          <div className="flex items-center justify-between bg-[#F5F5F7] p-4 rounded-2xl border border-zinc-200/60">
            <div className="text-xs sm:text-sm">
              {isCurrentCombinationOutOfStock ? (
                <span className="text-red-600 font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" /> Sin existencias en talla {selectedTalla}
                </span>
              ) : stockActual <=
                (producto.configuracion_alertas?.stock_minimo_alerta ?? 3) ? (
                <span className="text-[#111111] font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" /> ¡Últimas {stockActual}{' '}
                  unidades en talla {selectedTalla}!
                </span>
              ) : (
                <span className="text-zinc-700 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Disponible para entrega inmediata ({stockActual} un.)
                </span>
              )}
            </div>

            {!isCurrentCombinationOutOfStock && (
              <div className="flex items-center gap-1.5 bg-white rounded-full p-1.5 shadow-xs border border-zinc-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                  disabled={cantidad <= 1}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold text-[#111111] hover:bg-zinc-100 disabled:opacity-30 transition"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-black text-[#111111] tabular-nums">
                  {cantidad}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCantidad((prev) => Math.min(stockActual, prev + 1))
                  }
                  disabled={cantidad >= stockActual}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold text-[#111111] hover:bg-zinc-100 disabled:opacity-30 transition"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Feedback Toast */}
          {feedbackMsg && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-md ${
                feedbackMsg.type === 'success'
                  ? 'bg-[#111111] text-white'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              <span>{feedbackMsg.text}</span>
              {feedbackMsg.type === 'success' && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="px-3 py-1.5 rounded-full bg-white text-[#111111] text-xs font-extrabold ml-3 shrink-0 hover:bg-zinc-100 transition"
                >
                  Ver Carrito
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="p-5 sm:px-8 border-t border-zinc-200/80 bg-white flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
              Total a Pagar
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#111111] tabular-nums">
              {formatCOP(producto.precio_base * cantidad)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isCurrentCombinationOutOfStock}
            className={`flex-1 py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg ${
              isCurrentCombinationOutOfStock
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                : 'bg-[#111111] text-white hover:bg-zinc-800'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>
              {isCurrentCombinationOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailModal({
  producto,
  onClose,
  onOpenCart,
}: ProductDetailModalProps) {
  if (!producto) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <ProductDetailContent
        key={producto.id}
        producto={producto}
        onClose={onClose}
        onOpenCart={onOpenCart}
      />
    </div>
  );
}
