'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { ShieldCheck, Cookie, FileText, Lock, Check, MapPin } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'lasanta_cookie_consent_v1';

export function StoreFooter() {
  const { storeConfig } = useStore();

  return (
    <footer className="mt-14 border-t border-zinc-200 bg-[#F5F5F7] text-zinc-600 pb-28 pt-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Column (Logo Kept + New Corporate Tagline) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border border-zinc-300 bg-[#111111] shrink-0">
                <Image
                  src="/assets/brand/logo-la-santa.png"
                  alt="Logo de la Tienda"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#111111]">
                  {storeConfig.storeName}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  NIT: {storeConfig.storeNit || '901.482.319-4'}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-sm">
              {storeConfig.corporateTagline ||
                'Firma colombiana de moda urbana y marroquinería contemporánea. Distribución nacional garantizada, control de existencias en tiempo real y atención personalizada.'}
            </p>
          </div>

          {/* Policies & Legal Links */}
          <div className="md:col-span-4 space-y-2.5">
            <h4 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
              Políticas, Privacidad y Cookies
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/politicas?seccion=privacidad"
                  className="text-zinc-600 hover:text-[#111111] transition flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-[#111111]" />
                  <span>Política de Privacidad y Tratamiento de Datos</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/politicas?seccion=cookies"
                  className="text-zinc-600 hover:text-[#111111] transition flex items-center gap-1.5"
                >
                  <Cookie className="w-3.5 h-3.5 text-[#111111]" />
                  <span>Política de Uso de Cookies y Almacenamiento Local</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/politicas?seccion=terminos"
                  className="text-zinc-600 hover:text-[#111111] transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#111111]" />
                  <span>Términos y Condiciones de Compra</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/politicas?seccion=garantias"
                  className="text-zinc-600 hover:text-[#111111] transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
                  <span>Política de Envíos, Cambios y Garantías</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service & Cartagena Base Info */}
          <div className="md:col-span-3 space-y-2.5">
            <h4 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
              Centro de Despachos
            </h4>
            <p className="text-xs text-zinc-600 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#111111] shrink-0" />
              <span>{storeConfig.storeAddress || 'Despachos Locales y Nacionales'}</span>
            </p>
            <p className="text-xs text-zinc-500">
              WhatsApp Oficial: <strong className="text-[#111111]">+{storeConfig.storePhone}</strong>
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <Link
                href="/politicas"
                className="px-4 py-2 rounded-full bg-white border border-zinc-200 hover:border-zinc-400 text-[11px] font-bold text-[#111111] transition"
              >
                Centro Legal y Políticas
              </Link>
              <Link
                href="/admin"
                className="px-4 py-2 rounded-full bg-white border border-zinc-200 hover:border-zinc-400 text-[11px] font-bold text-[#111111] transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Acceso POS &amp; Inventario</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Downbar Bottom Copyright */}
        <div className="border-t border-zinc-200 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <p>© 2026 {storeConfig.storeName} Oficial. Todos los derechos reservados</p>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-zinc-400 hover:text-[#111111] transition flex items-center gap-1 text-[11px]"
            >
              <Lock className="w-3 h-3" />
              <span>Acceso Sistema POS</span>
            </Link>
            <p className="font-semibold text-[#111111]">
              Desarrollado por <span className="font-extrabold">HomeLab</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  React.useEffect(() => {
    const handle = requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!stored) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!visible) return null;

  const handleAccept = (level: 'all' | 'essential') => {
    try {
      localStorage.setItem(
        COOKIE_CONSENT_KEY,
        JSON.stringify({ level, acceptedAt: new Date().toISOString() })
      );
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none">
      <div className="max-w-xl mx-auto bg-white/95 backdrop-blur-xl border border-zinc-200 rounded-3xl p-4 shadow-xl pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#111111] shrink-0 mt-0.5">
            <Cookie className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-[#111111]">Aviso de Privacidad y Cookies</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Utilizamos cookies técnicas y almacenamiento local para conservar tu carrito de compras, favoritos e inventario en tiempo real. Consulta nuestra{' '}
              <Link
                href="/politicas?seccion=cookies"
                className="text-[#111111] underline font-semibold"
              >
                Política de Cookies
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => handleAccept('essential')}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-full bg-[#F5F5F7] hover:bg-zinc-200 text-[11px] font-bold text-[#111111] transition"
          >
            Esenciales
          </button>
          <button
            onClick={() => handleAccept('all')}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-[#111111] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aceptar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
