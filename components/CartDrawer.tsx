'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatCOP } from '@/lib/data';
import { generateWhatsAppMessage } from '@/lib/whatsapp';
import {
  X,
  Trash2,
  Send,
  ShoppingBag,
  User,
  MapPin,
  Phone,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTracker?: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const {
    cart,
    cartTotalCount,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    storeConfig,
    createOrder,
    browserPushPermission,
    requestBrowserPushPermission,
  } = useStore();

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastSentOrderNumber, setLastSentOrderNumber] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckoutWhatsApp = async () => {
    if (cart.length === 0) return;

    setIsSending(true);

    // Request push permission so the user automatically receives alerts when order is Despachado or Entregado
    if (browserPushPermission !== 'granted') {
      await requestBrowserPushPermission();
    }

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const orderNumCode = `#ORD-${randomDigits}`;
    const refUrl = `https://lasanta.store/pedido/ORD-${randomDigits}`;

    const { waLink } = generateWhatsAppMessage(
      {
        items: cart,
        subtotal: cartSubtotal,
        total: cartSubtotal,
        clienteNombre,
        clienteDireccion: clienteDireccion.trim() || storeConfig.storeCity,
        clienteTelefono,
        referenceUrl: refUrl,
      },
      storeConfig.storePhone
    );

    const created = createOrder({
      orderNumber: orderNumCode,
      clienteNombre,
      clienteDireccion: clienteDireccion.trim() || storeConfig.storeCity,
      clienteTelefono,
      referenceUrl: refUrl,
    });

    setLastSentOrderNumber(created.orderNumber);

    setTimeout(() => {
      window.open(waLink, '_blank', 'noopener,noreferrer');
      setIsSending(false);
    }, 350);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md h-full bg-white border-l border-zinc-200 flex flex-col justify-between shadow-2xl cursor-default"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#111111]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#111111]">
                Carrito de Compras <span className="text-zinc-400">({cartTotalCount})</span>
              </h2>
              <p className="text-[10px] text-zinc-500">
                Despachos desde {storeConfig.storeCity}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-zinc-400 hover:text-red-600 px-2 py-1 transition font-medium"
              >
                Vaciar
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F5F5F7] text-[#111111] flex items-center justify-center hover:bg-zinc-200 transition"
              aria-label="Cerrar carrito"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {lastSentOrderNumber && (
            <div className="p-4 rounded-2xl bg-[#111111] text-white text-xs space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold">Pedido {lastSentOrderNumber} registrado</p>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold">
                  En Proceso
                </span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                Tu solicitud fue recibida con éxito y enviada a nuestro equipo de ventas en Cartagena de Indias. Un asesor confirmará tu orden por WhatsApp.
              </p>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mx-auto text-zinc-400">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Tu carrito está vacío</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Explora el catálogo y selecciona tus tallas y colores preferidos.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-full bg-[#111111] text-xs font-bold text-white"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="p-3 bg-[#F5F5F7] rounded-3xl flex gap-3.5 relative"
                  >
                    {/* Item Image */}
                    <div className="relative w-18 h-18 rounded-2xl bg-white overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imagen}
                        alt={item.nombre}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className="text-xs font-bold text-[#111111] truncate">{item.nombre}</h4>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {item.categoria} · {item.color}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Talla: <strong className="text-[#111111]">{item.talla}</strong>
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-extrabold text-[#111111] tabular-nums">
                          {formatCOP(item.precio * item.cantidad)}
                        </span>

                        {/* Quantity controls */}
                        <div className="flex items-center rounded-full bg-white px-1 py-0.5 text-xs shadow-2xs">
                          <button
                            onClick={() => updateCartQuantity(item.cartItemId, item.cantidad - 1)}
                            className="w-6 h-6 flex items-center justify-center text-[#111111] font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-[#111111] tabular-nums">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.cartItemId, item.cantidad + 1)}
                            disabled={item.cantidad >= item.stockMaximo}
                            className="w-6 h-6 flex items-center justify-center text-[#111111] font-bold disabled:opacity-25"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-red-600"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Customer Shipping Info */}
              <div className="p-4 bg-[#F5F5F7] rounded-3xl space-y-2.5">
                <p className="text-xs font-bold text-[#111111]">
                  Datos de Envío y Alertas Push (WhatsApp)
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="w-full bg-white rounded-2xl pl-9 pr-3 py-2.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="tel"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="Teléfono / WhatsApp (ej. 300 123 4567)"
                      className="w-full bg-white rounded-2xl pl-9 pr-3 py-2.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={clienteDireccion}
                      onChange={(e) => setClienteDireccion(e.target.value)}
                      placeholder="Ciudad y dirección (ej. Cartagena, Bocagrande)"
                      className="w-full bg-white rounded-2xl pl-9 pr-3 py-2.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#111111]"
                    />
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-[#F5F5F7] p-4 rounded-3xl space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#111111] tabular-nums">
                    {formatCOP(cartSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Origen de Despacho</span>
                  <span className="text-[#111111] font-bold">
                    {storeConfig.storeCity}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Envío</span>
                  <span className="text-[#111111] font-medium">{storeConfig.deliveryNote}</span>
                </div>
                <div className="border-t border-zinc-200 pt-2.5 flex justify-between text-sm font-extrabold text-[#111111]">
                  <span>Total Estimado</span>
                  <span className="text-base tabular-nums">
                    {formatCOP(cartSubtotal)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* WhatsApp Checkout Action Button */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-zinc-100 bg-white space-y-2">
            <button
              onClick={handleCheckoutWhatsApp}
              disabled={isSending}
              className="w-full py-4 px-5 rounded-full bg-[#111111] hover:bg-zinc-800 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Preparando Pedido...' : 'Enviar Pedido por WhatsApp'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
