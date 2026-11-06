'use client';

import React from 'react';
import Link from 'next/link';
import { POSDashboard } from '@/components/POSDashboard';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function POSPage() {
  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <header className="border-b border-zinc-100 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center hover:bg-zinc-200 transition"
              title="Panel Administrativo"
            >
              <ArrowLeft className="w-4 h-4 text-[#111111]" />
            </Link>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                La Santa Store · Cartagena
              </span>
              <h1 className="text-sm font-black text-[#111111] uppercase tracking-tight">
                Módulo POS & Facturación Interna
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Panel General</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <POSDashboard />
      </main>
    </div>
  );
}
