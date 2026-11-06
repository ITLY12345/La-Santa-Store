'use client';

import React from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { ShoppingBag, Heart } from 'lucide-react';

interface HeaderProps {
  onOpenCart: () => void;
  activeNavTab?: 'home' | 'favorites';
  setActiveNavTab?: (tab: 'home' | 'favorites') => void;
}

export function Header({
  onOpenCart,
  activeNavTab = 'home',
  setActiveNavTab,
}: HeaderProps) {
  const { cartTotalCount, favorites } = useStore();

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xl border-b border-zinc-100">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Left: Profile Avatar (Logo Kept) + Minimalist Greeting (1:1 Dribbble #27573251) */}
        <button
          type="button"
          onClick={() => setActiveNavTab && setActiveNavTab('home')}
          className="flex items-center gap-3 text-left group"
        >
          <div className="relative w-11 h-11 rounded-full overflow-hidden border border-zinc-200 bg-[#111111] shrink-0 shadow-xs">
            <Image
              src="/assets/aistudio/file_00000000abd081f5882f0c7a3c3bc919_68d1d587.png"
              alt="Logo Perfil Tienda"
              fill
              className="object-cover"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block leading-tight">
              Cartagena de Indias · Colombia
            </span>
            <span className="text-sm sm:text-base font-black tracking-tight text-[#111111] block leading-tight uppercase">
              La Santa Store
            </span>
          </div>
        </button>

        {/* Right: Circular Soft Gray Action Icons (#F5F5F7 & #111111) - Admin button kept strictly in bottom dock */}
        <div className="flex items-center gap-2">
          {/* Tracking button removed from public customer topbar: order tracking is strictly internal in POS / Admin */}

          {/* Favorites quick toggle */}
          {setActiveNavTab && (
            <button
              type="button"
              onClick={() =>
                setActiveNavTab(activeNavTab === 'favorites' ? 'home' : 'favorites')
              }
              className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                activeNavTab === 'favorites'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F5F5F7] text-[#111111] hover:bg-zinc-200/80'
              }`}
              aria-label="Ver favoritos"
              title="Mis Favoritos"
            >
              <Heart
                className={`w-4 h-4 ${
                  activeNavTab === 'favorites' ? 'fill-white text-white' : ''
                }`}
              />
              {favorites.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#111111] text-white border border-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {favorites.length}
                </span>
              )}
            </button>
          )}

          {/* Carrito Trigger Button */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold active:scale-95 transition-transform"
            aria-label="Abrir Carrito de Compras"
            title="Abrir Carrito"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            {cartTotalCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#111111] border border-[#111111] text-[10px] font-black flex items-center justify-center tabular-nums">
                {cartTotalCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
