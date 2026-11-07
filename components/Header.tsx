'use client';

import React from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { ShoppingBag, Heart, MapPin, PackageCheck } from 'lucide-react';

interface HeaderProps {
  onOpenCart: () => void;
  onOpenTracker?: () => void;
  activeNavTab: 'home' | 'favorites';
  setActiveNavTab: (tab: 'home' | 'favorites') => void;
}

export function Header({
  onOpenCart,
  onOpenTracker,
  activeNavTab,
  setActiveNavTab,
}: HeaderProps) {
  const {
    cartTotalCount,
    favorites,
    storeConfig,
    unreadNotificationsCount,
  } = useStore();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between">
        {/* Left: Avatar / Brand Identity (1:1 Dribbble #27573251) */}
        <button
          type="button"
          onClick={() => setActiveNavTab('home')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#111111] border border-zinc-200 shrink-0 shadow-xs">
            <Image
              src="/assets/brand/logo-la-santa.png"
              alt="Logo La Santa Store"
              fill
              sizes="44px"
              className="object-cover"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 leading-none">
              <MapPin className="w-3 h-3 text-zinc-400" />
              <span>{storeConfig.storeCity || 'Cartagena, CO'}</span>
            </span>
            <span className="text-base font-bold tracking-tight text-[#111111] block mt-0.5">
              {storeConfig.storeName}
            </span>
          </div>
        </button>

        {/* Right: Quick Action Circles (Rastrear Pedido, Favorites & Bag - 1:1 Dribbble #27573251) */}
        <div className="flex items-center gap-2">
          {onOpenTracker && (
            <button
              type="button"
              onClick={onOpenTracker}
              className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/70 transition active:scale-95"
              aria-label="Rastrear pedido y notificaciones"
              title="Rastrear Pedido / Estado de Envío"
            >
              <PackageCheck className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-emerald-600 text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setActiveNavTab(activeNavTab === 'favorites' ? 'home' : 'favorites')
            }
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 ${
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
            className="relative w-10 h-10 rounded-full bg-[#F5F5F7] hover:bg-zinc-200/70 text-[#111111] flex items-center justify-center transition active:scale-95"
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
