'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { formatCOP } from '@/lib/data';
import { generateWhatsAppMessage } from '@/lib/whatsapp';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  CheckCircle2,
  User,
  MapPin,
  Phone,
  Truck,
  Store,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTracker?: () => void;
}

type ShippingOptionId = 'cartagena' | 'nacional' | 'recoger';

export function CartDrawer({
  isOpen,
  onClose,
  onOpenTracker,
}: CartDrawerProps) {
  const {
    cart,
    cartSubtotal,
    cartTotalCount,
    storeConfig,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    createOrder,
  } = useStore();

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [shippingOption, setShippingOption] =
    useState<ShippingOptionId>('cartagena');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [orderSuccessNumber, setOrderSuccessNumber] = useState<string | null>(
    null
  );

  const shippingDetails = useMemo(() => {
    const freeCartagenaThreshold = storeConfig.envioGratisDesde ?? 200000;
    const rateCartagena = storeConfig.tarifaEnvioCartagena ?? 8000;
    const rateNacional = storeConfig.tarifaEnvioNacional ?? 16000;

    if (shippingOption === 'recoger') {
      return {
        costo: 0,
        label: 'Recoger en Sede Oficial (Cartagena de Indias)',
        badge: 'Gratis',
      };
    }
    if (shippingOption === 'nacional') {
      return {
        costo: rateNacional,
        label: 'Envío Nacional Asegurado (Coordinadora / Envía)',
        badge: formatCOP(rateNacional),
      };
    }
    // Cartagena Urbano
    const isFree = cartSubtotal >= freeCartagenaThreshold;
    return {
      costo: isFree ? 0 : rateCartagena,
      label: isFree
        ? `Domicilio Express Cartagena (Gratis por compra ≥ ${formatCOP(
            freeCartagenaThreshold
          )})`
        : 'Domicilio Express Urbano (Cartagena de Indias)',
      badge: isFree ? 'Gratis' : formatCOP(rateCartagena),
    };
  }, [
    shippingOption,
    cartSubtotal,
    storeConfig.envioGratisDesde,
    storeConfig.tarifaEnvioCartagena,
    storeConfig.tarifaEnvioNacional,
  ]);

  const totalPagar = cartSubtotal + shippingDetails.costo;

  if (!isOpen) return null;

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;

    const cleanName = clienteNombre.trim();
    const cleanPhone = clienteTelefono.replace(/\D/g, '');
    const effectiveAddress =
      shippingOption === 'recoger'
        ? clienteDireccion.trim() ||
          'Recoger en Sede Oficial · Cartagena de Indias'
        : clienteDireccion.trim();

    if (cleanName.length < 3) {
      setValidationError(
        'Por favor ingresa tu nombre y apellido (mínimo 3 caracteres).'
      );
      return;
    }

    if (cleanPhone.length < 7) {
      setValidationError(
        'Por favor ingresa un número de celular o WhatsApp válido (mínimo 7 dígitos).'
      );
      return;
    }

    if (shippingOption !== 'recoger' && effectiveAddress.length < 6) {
      setValidationError(
        'Por favor ingresa la dirección exacta y barrio/ciudad de entrega.'
      );
      return;
    }

    setValidationError(null);

    // Generate a single unified order number shared between the database and the WhatsApp link
    const unifiedOrderNumber = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const refUrl = `https://lasantastore.enigmaproducciones.com/pedido/${unifiedOrderNumber.replace(
      '#',
      ''
    )}`;

    const { waLink } = generateWhatsAppMessage(
      {
        orderNumber: unifiedOrderNumber,
        items: cart,
        subtotal: cartSubtotal,
        costoEnvio: shippingDetails.costo,
        envioTexto: shippingDetails.label,
        total: totalPagar,
        clienteNombre: cleanName,
        clienteDireccion: effectiveAddress,
        clienteTelefono: clienteTelefono.trim(),
        referenceUrl: refUrl,
      },
      storeConfig.storePhone
    );

    const newOrder = createOrder({
      orderNumber: unifiedOrderNumber,
      clienteNombre: cleanName,
      clienteDireccion: effectiveAddress,
      clienteTelefono: clienteTelefono.trim(),
      costoEnvio: shippingDetails.costo,
      envioTexto: shippingDetails.label,
      referenceUrl: refUrl,
    });

    setOrderSuccessNumber(newOrder.orderNumber);
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#111111]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Mi Bolsa</h2>
              <p className="text-xs text-zinc-500">
                {cartTotalCount}{' '}
                {cartTotalCount === 1
                  ? 'prenda seleccionada'
                  : 'prendas seleccionadas'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar bolsa"
            className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#111111] hover:bg-zinc-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Dispatched Alert Banner */}
        {orderSuccessNumber && (
          <div className="m-4 p-4 rounded-2xl bg-[#F5F5F7] border border-zinc-200 flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-600 space-y-1">
                <p className="font-bold text-[#111111]">
                  ¡Orden {orderSuccessNumber} Generada!
                </p>
                <p>
                  Tu pedido fue registrado y se abrió WhatsApp con el resumen de
                  despacho. Conserva tu código{' '}
                  <strong className="text-[#111111]">
                    {orderSuccessNumber}
                  </strong>{' '}
                  para consultar tu guía en cualquier momento.
                </p>
              </div>
            </div>
            {onOpenTracker && (
              <button
                type="button"
                onClick={() => {
                  setOrderSuccessNumber(null);
                  onClose();
                  onOpenTracker();
                }}
                className="w-full py-2.5 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Rastrear Estado de mi Pedido ({orderSuccessNumber})</span>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center text-zinc-400 mb-4">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#111111] mb-1">
                Tu bolsa está vacía
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mb-6">
                Explora la colección de Camisetas, Bolsos y Chanclas y selecciona
                tu talla favorita.
              </p>
              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-full bg-[#111111] text-white font-semibold text-xs hover:bg-zinc-800 transition"
                >
                  Explorar Catálogo
                </button>
                {onOpenTracker && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTracker();
                    }}
                    className="px-6 py-3 rounded-full bg-[#F5F5F7] text-[#111111] font-semibold text-xs hover:bg-zinc-200 transition flex items-center justify-center gap-1.5"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Rastrear un Pedido Anterior</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Artículos
                  </span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-zinc-400 hover:text-rose-500 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Vaciar
                  </button>
                </div>

                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="p-3 rounded-2xl bg-[#F5F5F7] flex gap-3.5 items-center"
                  >
                    <div className="relative w-18 h-20 rounded-xl overflow-hidden bg-white shrink-0">
                      <Image
                        src={item.imagen}
                        alt={item.nombre}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#111111] truncate">
                          {item.nombre}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="text-zinc-400 hover:text-[#111111] p-0.5"
                          aria-label="Eliminar prenda"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {item.marca_motivo} · {item.color} · Talla{' '}
                        <strong className="text-[#111111]">{item.talla}</strong>
                      </p>

                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(
                                item.cartItemId,
                                item.cantidad - 1
                              )
                            }
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[#111111] hover:bg-zinc-100"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(
                                item.cartItemId,
                                item.cantidad + 1
                              )
                            }
                            disabled={item.cantidad >= item.stockMaximo}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[#111111] hover:bg-zinc-100 disabled:opacity-30"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-[#111111]">
                          {formatCOP(item.precio * item.cantidad)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Shipping / Modality Selector */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Modalidad de Entrega</span>
                  </h4>
                  {cartSubtotal < 200000 && shippingOption === 'cartagena' && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Envío gratis desde $200.000
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setShippingOption('cartagena')}
                    className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                      shippingOption === 'cartagena'
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#111111] border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold leading-tight">
                      Cartagena Urbano
                    </span>
                    <span
                      className={`text-[10px] font-semibold mt-1 ${
                        shippingOption === 'cartagena'
                          ? 'text-zinc-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      {cartSubtotal >= 200000 ? 'Gratis' : '$8.000'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingOption('nacional')}
                    className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                      shippingOption === 'nacional'
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#111111] border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold leading-tight">
                      Envío Nacional
                    </span>
                    <span
                      className={`text-[10px] font-semibold mt-1 ${
                        shippingOption === 'nacional'
                          ? 'text-zinc-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      $16.000
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingOption('recoger')}
                    className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                      shippingOption === 'recoger'
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#111111] border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold leading-tight flex items-center gap-1">
                      <Store className="w-3 h-3 shrink-0" /> Sede
                    </span>
                    <span
                      className={`text-[10px] font-semibold mt-1 ${
                        shippingOption === 'recoger'
                          ? 'text-zinc-300'
                          : 'text-emerald-600'
                      }`}
                    >
                      Gratis
                    </span>
                  </button>
                </div>
              </div>

              {/* Customer Delivery Data (Required with validation) */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#111111]">
                    Datos de Facturación y Despacho
                  </h4>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">
                    Requerido
                  </span>
                </div>

                {validationError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => {
                        setClienteNombre(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="Nombre y Apellido *"
                      required
                      className="w-full bg-white rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#111111]/15"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={clienteTelefono}
                      onChange={(e) => {
                        setClienteTelefono(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="WhatsApp / Celular de contacto *"
                      required
                      className="w-full bg-white rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#111111]/15"
                    />
                  </div>

                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clienteDireccion}
                      onChange={(e) => {
                        setClienteDireccion(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder={
                        shippingOption === 'recoger'
                          ? 'Barrio / Nota adicional (Retiro en Sede Cartagena)'
                          : shippingOption === 'nacional'
                          ? 'Dirección exacta, Barrio, Ciudad y Departamento *'
                          : 'Dirección en Cartagena, Barrio y Edificio/Casa *'
                      }
                      required={shippingOption !== 'recoger'}
                      className="w-full bg-white rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#111111]/15"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Checkout */}
        {cart.length > 0 && (
          <div className="p-5 bg-white border-t border-zinc-100 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal ({cartTotalCount} prendas)</span>
                <span className="font-semibold text-[#111111]">
                  {formatCOP(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span className="truncate pr-2">{shippingDetails.label}</span>
                <span className="font-semibold text-[#111111] shrink-0">
                  {shippingDetails.badge}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#111111] pt-2 border-t border-zinc-100">
                <span>Total a Pagar</span>
                <span className="text-base">{formatCOP(totalPagar)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckoutWhatsApp}
              className="w-full py-4 rounded-full bg-[#111111] hover:bg-zinc-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.99]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Confirmar Pedido por WhatsApp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
