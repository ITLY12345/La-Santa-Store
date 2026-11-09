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
      className="w-full sm:max-w-md max-h-[94vh] bg-white border border-zinc-200 rounded-t-[36px] sm:rounded-[36px] flex flex-col overflow-hidden shadow-2xl"
    >
      {/* Top Studio Multi-Photo Stage */}
      <div
        className="relative h-80 w-full bg-[#F5F5F7] shrink-0 select-none"
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
            className="w-10 h-10 rounded-full bg-white hover:bg-zinc-100 text-[#111111] shadow-sm flex items-center justify-center transition active:scale-90"
            aria-label="Regresar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {galleryImages.length > 1 && (
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold tabular-nums">
              Foto {safeImageIdx + 1} / {galleryImages.length}
            </span>
          )}

          <button
            type="button"
            onClick={() => toggleFavorite(producto.id)}
            className="w-10 h-10 rounded-full bg-white hover:bg-zinc-100 text-[#111111] shadow-sm flex items-center justify-center transition active:scale-90"
            aria-label="Favorito"
          >
            <Heart
              className={`w-4 h-4 ${
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
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#111111] shadow-md flex items-center justify-center transition active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#111111] shadow-md flex items-center justify-center transition active:scale-90"
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

      {/* Scrollable White Sheet Details */}
      <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4 space-y-5 bg-white rounded-t-[32px] -mt-6 relative z-10">
        {/* Interactive Thumbnail Strip (when multiple photos exist) */}
        {galleryImages.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {galleryImages.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                className={`relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                  idx === safeImageIdx
                    ? 'border-[#111111] scale-105 shadow-xs'
                    : 'border-transparent opacity-60 hover:opacity-100'
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

        {/* Title, Category & Price Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              <strong className="text-[#111111] font-semibold">
                {producto.categoria}
              </strong>{' '}
              · {producto.marca_motivo}
            </span>
            <span className="tabular-nums text-zinc-500">
              {isCurrentCombinationOutOfStock
                ? 'Agotado'
                : `${stockActual} en stock`}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111111] leading-tight">
              {producto.nombre}
            </h2>
            <span className="text-lg sm:text-xl font-extrabold text-[#111111] tabular-nums shrink-0">
              {formatCOP(producto.precio_base)}
            </span>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed pt-1">
            {producto.descripcion}
          </p>
        </div>

        {/* 1. Selector de Color */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#111111]">Color</span>
            <span className="text-zinc-500">{selectedColor}</span>
          </div>
          <div className="flex flex-wrap gap-2">
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
                        v.color.trim().toLowerCase() === color.trim().toLowerCase() &&
                        v.talla.trim().toLowerCase() === selectedTalla.trim().toLowerCase() &&
                        v.stock_disponible > 0
                    );
                    if (!hasCurrentSize) {
                      const firstAvailableForColor =
                        producto.variantes.find(
                          (v) =>
                            v.color.trim().toLowerCase() === color.trim().toLowerCase() &&
                            v.stock_disponible > 0
                        ) ||
                        producto.variantes.find(
                          (v) => v.color.trim().toLowerCase() === color.trim().toLowerCase()
                        );
                      if (firstAvailableForColor) {
                        setSelectedTalla(firstAvailableForColor.talla.trim());
                      }
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-[#111111] text-white'
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
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#111111]">Seleccionar Talla</span>
            <span className="text-zinc-500">
              Talla: <strong className="text-[#111111]">{selectedTalla}</strong>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
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
                  className={`py-2.5 px-2 rounded-2xl text-xs font-bold flex flex-col items-center justify-center transition-all ${
                    isOutOfStock
                      ? 'opacity-40 bg-[#F5F5F7] text-zinc-400 cursor-not-allowed line-through'
                      : isSelected
                      ? 'bg-[#111111] text-white shadow-sm'
                      : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/80 active:scale-95'
                  }`}
                >
                  <span>{talla}</span>
                  <span
                    className={`text-[10px] font-normal tabular-nums ${
                      isSelected
                        ? 'text-zinc-300'
                        : isOutOfStock
                        ? 'text-zinc-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {isOutOfStock ? 'Agotado' : `${sizeStock} un.`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity & Stock Status */}
        <div className="flex items-center justify-between bg-[#F5F5F7] p-3.5 rounded-2xl">
          <div className="text-xs">
            {isCurrentCombinationOutOfStock ? (
              <span className="text-red-600 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Sin existencias
              </span>
            ) : stockActual <=
              (producto.configuracion_alertas?.stock_minimo_alerta ?? 3) ? (
              <span className="text-[#111111] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Últimas {stockActual}{' '}
                unidades
              </span>
            ) : (
              <span className="text-zinc-700 font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#111111]" /> Disponible (
                {stockActual} un.)
              </span>
            )}
          </div>

          {!isCurrentCombinationOutOfStock && (
            <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                disabled={cantidad <= 1}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-[#111111] disabled:opacity-30"
              >
                -
              </button>
              <span className="w-7 text-center text-xs font-extrabold text-[#111111] tabular-nums">
                {cantidad}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCantidad((prev) => Math.min(stockActual, prev + 1))
                }
                disabled={cantidad >= stockActual}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-[#111111] disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Feedback Toast */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between ${
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
                className="underline text-white text-[11px] font-bold ml-2 shrink-0"
              >
                Ver Carrito
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="p-4 border-t border-zinc-100 bg-white flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] text-zinc-400 font-medium block">
            Precio Total
          </span>
          <span className="text-lg font-extrabold text-[#111111] tabular-nums">
            {formatCOP(producto.precio_base * cantidad)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isCurrentCombinationOutOfStock}
          className={`flex-1 py-4 px-5 rounded-full font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            isCurrentCombinationOutOfStock
              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              : 'bg-[#111111] text-white hover:bg-zinc-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>
            {isCurrentCombinationOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
          </span>
        </button>
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
