'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isInstalled = useSyncExternalStore(
    () => () => {},
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    () => false
  );

  const isIOS = useSyncExternalStore(
    () => () => {},
    () => {
      const ua = window.navigator.userAgent.toLowerCase();
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      return /iphone|ipad|ipod/.test(ua) && !standalone;
    },
    () => false
  );

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (!mounted || isInstalled || dismissed) return null;

  return (
    <>
      {deferredPrompt && (
        <div className="bg-[#F5F5F7] border-b border-zinc-200 px-4 py-2.5 flex items-center justify-between text-xs text-[#111111]">
          <span>Instala la aplicación móvil para acceso directo</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 rounded-full bg-[#111111] text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-zinc-400 hover:text-[#111111]"
              aria-label="Cerrar banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isIOS && !deferredPrompt && (
        <div className="bg-[#F5F5F7] border-b border-zinc-200 px-4 py-2 flex items-center justify-between text-xs text-[#111111]">
          <span>Agrega esta tienda a tu pantalla de inicio en iPhone</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIOSModal(true)}
              className="px-3 py-1 rounded-full bg-[#111111] text-white font-semibold text-[11px]"
            >
              Cómo instalar
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-zinc-400 hover:text-[#111111]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showIOSModal && (
        <div
          onClick={() => setShowIOSModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl text-[#111111] cursor-default"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-[#111111]">
                Instalar en iPhone
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-zinc-400 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Agrega la tienda a tu pantalla de inicio para una experiencia a pantalla completa:
            </p>
            <ol className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5 bg-[#F5F5F7] p-3 rounded-2xl">
                <Share2 className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                <span>1. Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.</span>
              </li>
              <li className="flex items-start gap-2.5 bg-[#F5F5F7] p-3 rounded-2xl">
                <PlusSquare className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                <span>2. Desliza hacia abajo y selecciona <strong>Agregar a pantalla de inicio</strong>.</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-3 bg-[#111111] text-white font-bold text-xs rounded-full"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
