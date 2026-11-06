'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { POSDashboard } from '@/components/POSDashboard';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

export default function POSPage() {
  const { isAdminAuthenticated, authenticateAdmin, logoutAdmin } = useStore();
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setIsVerifying(true);
    const ok = await authenticateAdmin(pinInput);
    setIsVerifying(false);
    if (ok) {
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col">
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
            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={logoutAdmin}
                className="px-4 py-2 rounded-full bg-[#F5F5F7] text-[#111111] hover:bg-red-50 hover:text-red-600 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {!isAdminAuthenticated ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <form
            onSubmit={handlePinSubmit}
            className="w-full max-w-sm bg-[#F5F5F7] rounded-3xl p-7 text-center space-y-5"
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-zinc-200 mx-auto bg-[#111111]">
              <Image
                src="/assets/aistudio/file_00000000abd081f5882f0c7a3c3bc919_68d1d587.png"
                alt="Logo"
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <Lock className="w-3 h-3" />
                <span>Terminal Punto de Venta</span>
              </div>
              <h2 className="text-lg font-extrabold text-[#111111]">
                Autenticación Requerida
              </h2>
              <p className="text-xs text-zinc-500">
                Ingresa tu código PIN administrativo para operar la caja y emitir facturas POS.
              </p>
            </div>

            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                aria-label="Código PIN de seguridad"
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-3 bg-white border border-zinc-200 rounded-2xl text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  Código PIN inválido. Verifica tus credenciales de administrador.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 rounded-full bg-[#111111] text-white font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 transition disabled:opacity-50"
            >
              {isVerifying ? 'Verificando...' : 'Desbloquear Terminal POS'}
            </button>
          </form>
        </main>
      ) : (
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
          <POSDashboard />
        </main>
      )}
    </div>
  );
}
