'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Producto, formatCOP } from '@/lib/data';
import { useStore } from '@/lib/store';
import { Heart, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductCardProps {
  producto: Producto;
  onSelect: (producto: Producto) => void;
}

export function ProductCard({ producto, onSelect }: ProductCardProps) {
  const { favorites, toggleFavorite, addToCart } = useStore();
  const [justAdded, setJustAdded] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  const isFavorite = favorites.includes(producto.id);

  const images =
    Array.isArray(producto.imagenes) && producto.imagenes.length > 0
      ? producto.imagenes
      : [
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85',
        ];
  const safeIdx = activeImgIdx < images.length ? activeImgIdx : 0;
  const currentImg = images[safeIdx];
  const isCustomOrDataImg =
    currentImg.startsWith('data:') ||
    (!currentImg.includes('images.unsplash.com') &&
      !currentImg.includes('picsum.photos'));

  const totalStock = producto.variantes.reduce(
    (acc, v) => acc + v.stock_disponible,
    0
  );
  const isOutOfStock = totalStock === 0;

  const availableSizes = Array.from(
    new Set(
      producto.variantes
        .filter((v) => v.stock_disponible > 0)
        .map((v) => v.talla.replace(/\s+/g, ' ').trim())
    )
  );

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const firstAvailableVariant = producto.variantes.find(
      (v) => v.stock_disponible > 0
    );
    if (!firstAvailableVariant) {
      onSelect(producto);
      return;
    }

    const res = addToCart({
      productoId: producto.id,
      varianteId: firstAvailableVariant.id_variante,
      nombre: producto.nombre,
      categoria: producto.categoria,
      marca_motivo: producto.marca_motivo,
      talla: firstAvailableVariant.talla,
      color: firstAvailableVariant.color,
      diseno_motivo: firstAvailableVariant.diseno_motivo,
      precio: producto.precio_base,
      cantidad: 1,
      stockMaximo: firstAvailableVariant.stock_disponible,
      imagen: images[0] || '',
    });

    if (res.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1400);
    } else {
      onSelect(producto);
    }
  };

  const handlePrevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIdx((prev) => (prev + 1) % images.length);
  };

  return (
    <div
      onClick={() => onSelect(producto)}
      className="group cursor-pointer flex flex-col transition-all duration-300"
    >
      {/* Image Container - Rounded 28px like Dribbble #27573251 */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-[#F5F5F7]">
        {isCustomOrDataImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImg}
            alt={producto.nombre}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Image
            src={currentImg}
            alt={producto.nombre}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Top-Right Heart Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(producto.id);
          }}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm transition active:scale-90 hover:bg-white z-10"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#111111]'
            }`}
          />
        </button>

        {/* Multi-Photo Prev / Next Controls on Card */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImg}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 backdrop-blur-md text-[#111111] flex items-center justify-center shadow-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition hover:bg-white active:scale-90 z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextImg}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 backdrop-blur-md text-[#111111] flex items-center justify-center shadow-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition hover:bg-white active:scale-90 z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/35 backdrop-blur-xs px-2 py-1 rounded-full z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIdx(idx);
                  }}
                  aria-label={`Ver foto ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === safeIdx ? 'w-3.5 bg-white' : 'w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Bottom-Left Subtle Stock Badge */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
          {isOutOfStock ? (
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#111111] text-white rounded-full">
              Agotado
            </span>
          ) : totalStock <=
            (producto.configuracion_alertas?.stock_minimo_alerta || 5) ? (
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/95 text-[#111111] rounded-full shadow-sm">
              Últimas {totalStock}
            </span>
          ) : null}
        </div>
      </div>

      {/* Product Details Below Card */}
      <div className="pt-3 px-1 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-medium text-zinc-500 truncate">
            {producto.categoria} · {producto.marca_motivo}
          </span>
          {!isOutOfStock && availableSizes.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {availableSizes.slice(0, 3).map((sz) => (
                <span
                  key={sz}
                  className="px-1.5 py-0.5 rounded-md bg-[#F5F5F7] text-[9px] font-bold text-zinc-600"
                >
                  {sz}
                </span>
              ))}
              {availableSizes.length > 3 && (
                <span className="text-[9px] font-bold text-zinc-400">
                  +{availableSizes.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <h3 className="text-sm font-semibold text-[#111111] leading-snug line-clamp-1">
          {producto.nombre}
        </h3>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-bold text-[#111111]">
            {formatCOP(producto.precio_base)}
          </span>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isOutOfStock}
            aria-label={
              isOutOfStock
                ? 'Producto agotado'
                : `Agregar ${producto.nombre} a la bolsa`
            }
            title={
              isOutOfStock
                ? 'Agotado'
                : `Agregar rápido (${availableSizes[0] || 'Talla única'})`
            }
            className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 ${
              isOutOfStock
                ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                : justAdded
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-[#F5F5F7] text-[#111111] hover:bg-[#111111] hover:text-white group-hover:bg-[#111111] group-hover:text-white'
            }`}
          >
            {justAdded ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
