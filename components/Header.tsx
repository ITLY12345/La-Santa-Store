'use client';

import React from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { ShoppingBag, Heart } from 'lucide-react';

interface HeaderProps {
  onOpenCart: () => void;
  activeNavTab: 'home' | 'favorites';
  setActiveNavTab: (tab: 'home' | 'favorites') => void;
}

export function Header({
  onOpenCart,
  activeNavTab,
  setActiveNavTab,
}: HeaderProps) {
  const { cartTotalCount, favorites, storeConfig } = useStore();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-100/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Left: Prominent Flagship Brand Identity */}
        <button
          type="button"
          onClick={() => setActiveNavTab('home')}
          className="flex items-center gap-3.5 text-left group focus:outline-none"
        >
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[#111111] border-2 border-[#111111] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Image
              src="/assets/brand/logo-la-santa.png"
              alt="Logo La Santa Store"
              fill
              sizes="56px"
              className="object-cover"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight uppercase text-[#111111] leading-none">
              {storeConfig.storeName || 'La Santa Store'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 mt-1">
              Tienda Oficial
            </span>
          </div>
        </button>

        {/* Right: Quick Action Circles (Favorites & Bag) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              setActiveNavTab(activeNavTab === 'favorites' ? 'home' : 'favorites')
            }
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
              activeNavTab === 'favorites'
                ? 'bg-[#111111] text-white'
                : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70'
            }`}
            aria-label="Mis favoritos"
            title="Favoritos"
          >
            <Heart
              className={`w-4 h-4 ${
                activeNavTab === 'favorites' ? 'fill-white' : ''
              }`}
            />
            {favorites.length > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  activeNavTab === 'favorites'
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#111111] text-white'
                }`}
              >
                {favorites.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="relative w-11 h-11 rounded-full bg-[#F5F5F7] hover:bg-zinc-200/70 text-[#111111] flex items-center justify-center transition active:scale-95"
            aria-label="Abrir bolsa de compras"
            title="Bolsa de compras"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartTotalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center justify-center">
                {cartTotalCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
