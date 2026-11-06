'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { formatCOP, EstadoPedido } from '@/lib/data';
import {
  Bell,
  BellRing,
  X,
  Truck,
  CheckCircle2,
  Package,
  Search,
  MapPin,
  Clock,
  Receipt,
} from 'lucide-react';

export function PushNotificationToast({
  onOpenTracker,
}: {
  onOpenTracker: () => void;
}) {
  const { activePushToast, dismissPushToast } = useStore();

  if (!activePushToast) return null;

  const isDelivered = activePushToast.estado === 'Entregado';

  return (
    <div className="fixed top-20 left-0 right-0 z-50 px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="max-w-md mx-auto bg-[#111111] text-white rounded-3xl p-4 shadow-2xl pointer-events-auto border border-zinc-800 flex items-start gap-3.5">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            isDelivered ? 'bg-emerald-500 text-black' : 'bg-white text-[#111111]'
          }`}
        >
          {isDelivered ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Truck className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Notificación Push · {activePushToast.estado}
            </span>
            <span className="text-[10px] text-zinc-400 tabular-nums">
              {activePushToast.fecha}
            </span>
          </div>
          <p className="font-bold text-white text-sm leading-snug">
            {activePushToast.titulo}
          </p>
          <p className="text-zinc-300 text-xs leading-relaxed">
            {activePushToast.mensaje}
          </p>
          <div className="pt-1.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                dismissPushToast();
                onOpenTracker();
              }}
              className="px-3.5 py-1.5 rounded-full bg-white text-[#111111] font-bold text-[11px] hover:bg-zinc-200 transition"
            >
              Ver Seguimiento
            </button>
            <button
              type="button"
              onClick={dismissPushToast}
              className="text-zinc-400 hover:text-white text-[11px] font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissPushToast}
          className="text-zinc-400 hover:text-white p-1"
          aria-label="Cerrar alerta push"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderTrackerModal({ isOpen, onClose }: OrderTrackerModalProps) {
  const {
    orders,
    notifications,
    markAllNotificationsRead,
    browserPushPermission,
    requestBrowserPushPermission,
    triggerManualPushTest,
  } = useStore();

  const [activeView, setActiveView] = useState<'notifications' | 'tracking'>('notifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [pushRequestStatus, setPushRequestStatus] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(q)) ||
        o.clienteNombre.toLowerCase().includes(q) ||
        o.clienteTelefono.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    const granted = await requestBrowserPushPermission();
    if (granted) {
      setPushRequestStatus(
        '¡Notificaciones Push nativas activadas! Recibirás alertas cuando tu pedido sea Despachado o Entregado.'
      );
      if (orders[0]) {
        triggerManualPushTest(
          orders[0],
          orders[0].estado === 'Entregado' ? 'Entregado' : 'Despachado'
        );
      }
    } else {
      setPushRequestStatus(
        'Las alertas se mostrarán directamente en el centro de notificaciones de la tienda.'
      );
    }
    setTimeout(() => setPushRequestStatus(null), 5000);
  };

  const getStepIndex = (estado: EstadoPedido): number => {
    switch (estado) {
      case 'Pendiente':
        return 1;
      case 'Facturado':
        return 2;
      case 'Despachado':
        return 3;
      case 'Entregado':
        return 4;
      default:
        return 0;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-[32px] border border-zinc-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col cursor-default"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#111111]">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#111111]">
                Notificaciones Push y Rastreo
              </h2>
              <p className="text-[11px] text-zinc-500">
                Centro Logístico Cartagena de Indias · Alertas de Despacho y Entrega
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F5F5F7] text-[#111111] flex items-center justify-center hover:bg-zinc-200 transition"
            aria-label="Cerrar seguimiento"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Push Subscription Banner */}
        <div className="px-5 pt-4">
          <div className="p-3.5 rounded-2xl bg-[#F5F5F7] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <Bell className="w-4 h-4 text-[#111111] shrink-0" />
              <div>
                <p className="font-bold text-[#111111]">
                  {browserPushPermission === 'granted'
                    ? 'Alertas Push Activas en este Dispositivo'
                    : 'Recibe Alertas Push de tu Pedido'}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Te avisamos al instante cuando tu pedido cambie a <strong>Despachado</strong> o{' '}
                  <strong>Entregado</strong>.
                </p>
              </div>
            </div>

            {browserPushPermission !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnablePush}
                className="px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-zinc-800 transition shrink-0"
              >
                Activar Push
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (orders[0]) {
                    triggerManualPushTest(orders[0], 'Despachado');
                  }
                }}
                className="px-3.5 py-1.5 rounded-full bg-white border border-zinc-200 text-[#111111] text-[11px] font-bold hover:bg-zinc-100 transition shrink-0"
              >
                Probar Alerta
              </button>
            )}
          </div>

          {pushRequestStatus && (
            <p className="mt-2 text-xs font-semibold text-[#111111] bg-zinc-100 px-3 py-2 rounded-xl">
              {pushRequestStatus}
            </p>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('notifications')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                activeView === 'notifications'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
              }`}
            >
              Alertas Recibidas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView('tracking')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                activeView === 'tracking'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#111111]'
              }`}
            >
              Rastrear Pedido ({orders.length})
            </button>
          </div>

          {activeView === 'notifications' && notifications.some((n) => !n.leida) && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="text-[11px] font-semibold text-[#111111] underline"
            >
              Marcar leídas
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeView === 'notifications' ? (
            notifications.length === 0 ? (
              <div className="py-12 text-center bg-[#F5F5F7] rounded-3xl p-6 space-y-2">
                <Bell className="w-7 h-7 text-zinc-400 mx-auto" />
                <p className="text-xs font-bold text-[#111111]">
                  Aún no hay alertas de despacho registradas
                </p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Cuando tu pedido de WhatsApp pase a estado Despachado o Entregado en nuestra sede de Cartagena, aparecerá aquí.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={markAllNotificationsRead}
                  className={`p-4 rounded-3xl border transition ${
                    notif.leida
                      ? 'bg-[#F5F5F7] border-transparent'
                      : 'bg-white border-[#111111] shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#111111]">
                      {notif.estado === 'Entregado' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Truck className="w-3.5 h-3.5 text-[#111111]" />
                      )}
                      <span>Estado: {notif.estado}</span>
                    </span>
                    <span className="text-[11px] text-zinc-400 tabular-nums">
                      {notif.fecha}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#111111]">{notif.titulo}</h4>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{notif.mensaje}</p>
                  {(notif.transportadora || notif.guiaSeguimiento) && (
                    <div className="mt-2 pt-2 border-t border-zinc-200/70 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                      {notif.transportadora && (
                        <span>
                          Transportadora: <strong className="text-[#111111]">{notif.transportadora}</strong>
                        </span>
                      )}
                      {notif.guiaSeguimiento && (
                        <span>
                          Guía: <strong className="text-[#111111] font-mono">{notif.guiaSeguimiento}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            <div className="space-y-3">
              {/* Search Order Box */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por #ORD-1001, FAC-1001, nombre o teléfono..."
                  className="w-full bg-[#F5F5F7] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#111111] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#111111]"
                />
              </div>

              {filteredOrders.map((ord) => {
                const step = getStepIndex(ord.estado);
                return (
                  <div
                    key={ord.id}
                    className="p-4 rounded-3xl bg-[#F5F5F7] space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-extrabold text-[#111111] text-sm">
                          {ord.orderNumber}{' '}
                          {ord.invoiceNumber ? `· ${ord.invoiceNumber}` : ''}
                        </span>
                        <p className="font-bold text-[#111111] mt-0.5">
                          {ord.clienteNombre}
                        </p>
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{ord.clienteDireccion}</span>
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                          ord.estado === 'Entregado'
                            ? 'bg-emerald-600 text-white'
                            : ord.estado === 'Despachado'
                            ? 'bg-[#111111] text-white'
                            : ord.estado === 'Cancelado'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white text-[#111111] border border-zinc-200'
                        }`}
                      >
                        {ord.estado}
                      </span>
                    </div>

                    {/* 4-Step Visual Progress Bar */}
                    {ord.estado !== 'Cancelado' && (
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {[
                          { idx: 1, label: 'Pendiente', icon: Clock },
                          { idx: 2, label: 'Facturado', icon: Receipt },
                          { idx: 3, label: 'Despachado', icon: Truck },
                          { idx: 4, label: 'Entregado', icon: Package },
                        ].map((st) => {
                          const active = step >= st.idx;
                          const IconComp = st.icon;
                          return (
                            <div
                              key={st.idx}
                              className={`p-2 rounded-2xl text-center flex flex-col items-center gap-1 ${
                                active
                                  ? 'bg-[#111111] text-white'
                                  : 'bg-white text-zinc-400'
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">{st.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        {ord.items.reduce((a, b) => a + b.cantidad, 0)} prendas · Origen:{' '}
                        <strong className="text-[#111111]">{ord.origen}</strong>
                      </span>
                      <span className="font-extrabold text-[#111111] tabular-nums text-xs">
                        {formatCOP(ord.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
