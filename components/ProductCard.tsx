'use client';

import React from 'react';
import Image from 'next/image';
import { Producto, formatCOP } from '@/lib/data';
import { useStore } from '@/lib/store';
import { Heart, Plus } from 'lucide-react';

interface ProductCardProps {
  producto: Producto;
  onSelect: (producto: Producto) => void;
}

export function ProductCard({ producto, onSelect }: ProductCardProps) {
  const { favorites, toggleFavorite } = useStore();
  const isFavorite = favorites.includes(producto.id);

  const totalStock = producto.variantes.reduce((sum, v) => sum + v.stock_disponible, 0);
  const isOutOfStock = totalStock <= 0;
  const isCriticalStock =
    !isOutOfStock && totalStock <= (producto.configuracion_alertas?.stock_minimo_alerta ?? 3);

  const uniqueSizes = Array.from(new Set(producto.variantes.map((v) => v.talla)));
  const primaryImg =
    producto.imagenes[0] ||
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85';
  const isCustomOrDataImg =
    primaryImg.startsWith('data:') ||
    (!primaryImg.includes('images.unsplash.com') && !primaryImg.includes('picsum.photos'));

  return (
    <article
      onClick={() => onSelect(producto)}
      className="group relative bg-white rounded-[28px] flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {/* Top Media Container (#F5F5F7 Soft Gray Rounded Frame 1:1 Dribbble #27573251) */}
      <div className="relative aspect-[4/5] w-full rounded-[24px] bg-[#F5F5F7] overflow-hidden">
        {isCustomOrDataImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImg}
            alt={producto.nombre}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              isOutOfStock ? 'opacity-40 grayscale' : ''
            }`}
          />
        ) : (
          <Image
            src={primaryImg}
            alt={producto.nombre}
            fill
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
              isOutOfStock ? 'opacity-40 grayscale' : ''
            }`}
            sizes="(max-width: 768px) 50vw, 33vw"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Top-Left Subtle Stock Text */}
        <div className="absolute top-3 left-3.5 z-10">
          {isOutOfStock ? (
            <span className="text-[11px] font-bold text-red-600 bg-white/90 px-2.5 py-1 rounded-full backdrop-blur-xs">
              Agotado
            </span>
          ) : isCriticalStock ? (
            <span className="text-[11px] font-semibold text-[#111111] bg-white/90 px-2.5 py-1 rounded-full backdrop-blur-xs">
              Últimas {totalStock}
            </span>
          ) : null}
        </div>

        {/* Top-Right Circular White Wishlist Heart Button (1:1 Dribbble #27573251) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(producto.id);
          }}
          aria-label="Guardar en favoritos"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-[#111111] shadow-xs flex items-center justify-center transition-transform active:scale-90"
        >
          <Heart
            className={`w-4 h-4 ${
              isFavorite ? 'fill-[#111111] text-[#111111]' : 'text-[#111111]'
            }`}
          />
        </button>
      </div>

      {/* Bottom Details & Price Row */}
      <div className="pt-3 px-1 pb-1 flex flex-col justify-between flex-grow gap-1.5">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="font-medium">{producto.categoria}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">Tallas {uniqueSizes.slice(0, 3).join('/')}</span>
          </div>

          <h3 className="text-sm font-bold text-[#111111] line-clamp-1 mt-0.5">
            {producto.nombre}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm sm:text-base font-extrabold text-[#111111] tabular-nums tracking-tight">
            {formatCOP(producto.precio_base)}
          </span>

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isOutOfStock
                ? 'bg-zinc-200 text-zinc-400'
                : 'bg-[#111111] text-white group-hover:scale-105'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
      </div>
    </article>
  );
}
