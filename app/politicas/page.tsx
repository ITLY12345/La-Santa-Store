'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  ArrowLeft,
  Lock,
  Cookie,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

type PolicyTab = 'privacidad' | 'cookies' | 'terminos' | 'garantias';

function PoliticasContent() {
  const { storeConfig } = useStore();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('seccion') as PolicyTab) || 'privacidad';

  const [activeTab, setActiveTab] = useState<PolicyTab>(
    ['privacidad', 'cookies', 'terminos', 'garantias'].includes(initialTab)
      ? initialTab
      : 'privacidad'
  );

  const [cookieSavedMsg, setCookieSavedMsg] = useState<string | null>(null);

  const handleSaveCookiePref = (level: 'all' | 'essential') => {
    try {
      localStorage.setItem(
        'lasanta_cookie_consent_v1',
        JSON.stringify({ level, acceptedAt: new Date().toISOString() })
      );
      setCookieSavedMsg(
        level === 'all'
          ? 'Preferencia guardada: Todas las cookies y funciones locales activas.'
          : 'Preferencia guardada: Solo cookies estrictamente necesarias activas.'
      );
      setTimeout(() => setCookieSavedMsg(null), 3500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-zinc-100 px-4 sm:px-6 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-zinc-200 text-xs font-bold text-[#111111] flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Catálogo</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-200 bg-[#111111]">
              <Image
                src="/assets/aistudio/file_00000000abd081f5882f0c7a3c3bc919_68d1d587.png"
                alt="Store Logo"
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-[#111111]">
              Centro Legal & Cookies
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Intro Banner */}
        <div className="bg-[#F5F5F7] rounded-3xl p-6 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            Transparencia y Cumplimiento Normativo
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
            Políticas de Privacidad, Términos y Uso de Cookies
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            En <strong>{storeConfig.storeName}</strong> (NIT {storeConfig.storeNit || '901.482.319-4'}) protegemos tus datos personales y garantizamos transparencia en cada pedido realizado a través de nuestro catálogo móvil y canal oficial de WhatsApp.
          </p>
        </div>

        {/* Section Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setActiveTab('privacidad')}
            className={`p-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'privacidad'
                ? 'bg-[#111111] text-white'
                : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>Privacidad y Datos</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`p-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'cookies'
                ? 'bg-[#111111] text-white'
                : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
            }`}
          >
            <Cookie className="w-4 h-4 shrink-0" />
            <span>Política de Cookies</span>
          </button>

          <button
            onClick={() => setActiveTab('terminos')}
            className={`p-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'terminos'
                ? 'bg-[#111111] text-white'
                : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Términos de Uso</span>
          </button>

          <button
            onClick={() => setActiveTab('garantias')}
            className={`p-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'garantias'
                ? 'bg-[#111111] text-white'
                : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Envíos y Garantías</span>
          </button>
        </div>

        {/* Policy Content Card */}
        <div className="bg-[#F5F5F7] rounded-3xl p-6 sm:p-8 space-y-5 text-xs sm:text-sm text-zinc-600 leading-relaxed">
          {activeTab === 'privacidad' && (
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#111111]">
                1. Política de Privacidad y Tratamiento de Datos Personales
              </h2>
              <p>
                En cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> y el Decreto Reglamentario 1377 de 2013 de la República de Colombia (Habeas Data), <strong>{storeConfig.storeName}</strong> informa a sus clientes y usuarios que los datos suministrados voluntariamente al generar un pedido o factura son tratados bajo estricta confidencialidad.
              </p>
              <div className="space-y-2 bg-white p-5 rounded-2xl">
                <h3 className="font-bold text-[#111111] text-xs uppercase">
                  ¿Qué datos recopilamos y con qué finalidad?
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-zinc-600">
                  <li>
                    <strong>Nombre y Documento (Cédula/NIT):</strong> Necesarios para la expedición de la factura interna de venta y guía de transporte.
                  </li>
                  <li>
                    <strong>Dirección y Ciudad de Entrega:</strong> Utilizados exclusivamente para el despacho de tus productos mediante empresas transportadoras aliadas.
                  </li>
                  <li>
                    <strong>Número de Teléfono / WhatsApp:</strong> Empleado para confirmar disponibilidad de variantes, coordinar el pago y enviar el seguimiento del pedido.
                  </li>
                </ul>
              </div>
              <p>
                <strong>Derechos del Titular (ARCO):</strong> Como titular de tus datos tienes derecho en todo momento a conocer, actualizar, rectificar y solicitar la supresión de tu información comunicándote directamente a nuestra línea oficial de WhatsApp <strong>+{storeConfig.storePhone}</strong>.
              </p>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#111111]">
                2. Política de Cookies y Almacenamiento Local (PWA)
              </h2>
              <p>
                Nuestra aplicación web progresiva utiliza tecnologías de almacenamiento en el navegador (<code>localStorage</code>, <code>sessionStorage</code> y cookies técnicas) para brindarte una experiencia de compra instantánea, incluso en conexiones móviles inestables.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white space-y-1.5">
                  <span className="text-[11px] font-bold text-[#111111] uppercase">
                    Siempre Activas · Esenciales
                  </span>
                  <h4 className="font-bold text-[#111111] text-xs">
                    Carrito de Compras e Inventario Local
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Conservan las prendas agregadas a tu carrito de compras, tus tallas seleccionadas y la sincronización de stock para que no pierdas tu selección al recargar la página.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase">
                    Funcionales · Preferencias
                  </span>
                  <h4 className="font-bold text-[#111111] text-xs">
                    Lista de Favoritos (♥) y Consentimiento
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Guardan tus productos marcados como favoritos y recuerdan tu elección sobre el aviso de cookies e instalación de la aplicación móvil.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-[#111111] text-xs">
                    Gestionar tu Preferencia de Cookies Ahora
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Puedes actualizar tu consentimiento en cualquier momento desde este panel:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveCookiePref('essential')}
                    className="px-4 py-2 rounded-full bg-[#F5F5F7] hover:bg-zinc-200 text-xs font-bold text-[#111111] transition"
                  >
                    Solo Esenciales
                  </button>
                  <button
                    onClick={() => handleSaveCookiePref('all')}
                    className="px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-bold transition"
                  >
                    Aceptar Todas
                  </button>
                </div>
              </div>

              {cookieSavedMsg && (
                <div className="p-3 rounded-2xl bg-[#111111] text-white text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{cookieSavedMsg}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'terminos' && (
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#111111]">
                3. Términos y Condiciones de Compra
              </h2>
              <p>
                Al realizar un pedido a través del catálogo interactivo de <strong>{storeConfig.storeName}</strong>, el usuario acepta las siguientes condiciones comerciales:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-zinc-600">
                <li>
                  <strong>Precios en Pesos Colombianos (COP):</strong> Todos los valores exhibidos están expresados en moneda legal colombiana ($ COP). El valor del envío se liquida según la ciudad de destino al confirmar la factura por WhatsApp.
                </li>
                <li>
                  <strong>Reserva y Descuento de Inventario:</strong> La generación del mensaje de WhatsApp registra una orden en estado <em>Pendiente</em>. Las unidades se descuentan en firme del inventario una vez el asesor confirma el pago o acuerdo de entrega y emite la <strong>Factura Oficial (FAC)</strong>.
                </li>
                <li>
                  <strong>Veracidad de la Información:</strong> El comprador es responsable de suministrar correctamente la talla, color, motivo y dirección exacta de entrega.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'garantias' && (
            <div className="space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#111111]">
                4. Política de Envíos, Cambios y Garantías
              </h2>
              <p>
                Nuestros productos pasan por un control de calidad riguroso antes de cada despacho.
              </p>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-white">
                  <h4 className="font-bold text-[#111111] mb-1">Plazos de Cambio por Talla</h4>
                  <p className="text-zinc-600">
                    Cuentas con hasta <strong>15 días calendario</strong> tras recibir tu pedido para solicitar cambio de talla, siempre que el producto se encuentre nuevo, sin uso, con sus etiquetas originales intactas y presentando tu número de factura (<code>FAC-XXXX</code>).
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white">
                  <h4 className="font-bold text-[#111111] mb-1">Garantía por Defectos de Fabricación</h4>
                  <p className="text-zinc-600">
                    Ofrecemos <strong>30 días de garantía directa</strong> por defectos de costuras, herrajes o desprendimiento anormal bajo condiciones normales de uso y lavado.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PoliticasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white text-zinc-500 flex items-center justify-center text-xs">
          Cargando políticas legales...
        </div>
      }
    >
      <PoliticasContent />
    </Suspense>
  );
}
