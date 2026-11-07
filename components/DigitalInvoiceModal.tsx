'use client';

import React from 'react';
import Image from 'next/image';
import { Order, formatCOP, calculateTaxBreakdown } from '@/lib/data';
import { useStore } from '@/lib/store';
import {
  X,
  Printer,
  CheckCircle,
  Clock,
  Truck,
  Ban,
  FileCheck2,
  Wallet,
  PackageCheck,
} from 'lucide-react';

interface DigitalInvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export function DigitalInvoiceModal({ order, onClose }: DigitalInvoiceModalProps) {
  const { storeConfig } = useStore();

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (estado: Order['estado']) => {
    switch (estado) {
      case 'Facturado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#111111] text-white">
            <CheckCircle className="w-3.5 h-3.5" /> Facturado
          </span>
        );
      case 'Despachado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-white">
            <Truck className="w-3.5 h-3.5" /> Despachado
          </span>
        );
      case 'Entregado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
            <PackageCheck className="w-3.5 h-3.5" /> Entregado
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            <Ban className="w-3.5 h-3.5" /> Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F5F5F7] text-zinc-700">
            <Clock className="w-3.5 h-3.5" /> Pendiente por Facturar
          </span>
        );
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col cursor-default"
      >
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-[#F5F5F7] print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#111111]" />
            <span className="text-xs font-bold text-[#111111]">
              {order.invoiceNumber
                ? `Factura de Venta POS ${order.invoiceNumber}`
                : `Orden de Pedido ${order.orderNumber}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-800 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-zinc-200 text-[#111111] flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-6 overflow-y-auto space-y-5 text-[#111111] text-xs print:p-2">
          {/* Header (Logo Kept) */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-zinc-200 bg-[#111111] shrink-0">
                <Image
                  src="/assets/brand/logo-la-santa.png"
                  alt="Logo de la Tienda"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-[#111111]">
                  {storeConfig.storeName}
                </h1>
                <p className="text-[11px] text-zinc-600 font-semibold">
                  NIT: {storeConfig.storeNit || '901.482.319-4'}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Tel / WhatsApp: +{storeConfig.storePhone}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {storeConfig.storeAddress || 'Cartagena de Indias, Colombia'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 block">
                {order.invoiceNumber ? 'Factura Oficial N°' : 'Orden de Pedido N°'}
              </span>
              <p className="text-base font-extrabold text-[#111111] font-mono tabular-nums">
                {order.invoiceNumber || order.orderNumber}
              </p>
              {order.invoiceNumber && (
                <p className="text-[10px] text-zinc-400 font-mono">Ref: {order.orderNumber}</p>
              )}
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Emisión: {order.fechaFacturacion || order.fecha}
              </p>
              {order.creditNoteNumber && (
                <p className="text-[11px] font-bold text-red-700 font-mono mt-0.5">
                  Nota Crédito: {order.creditNoteNumber}
                </p>
              )}
              <div className="mt-2">{getStatusBadge(order.estado)}</div>
            </div>
          </div>

          {order.creditNoteNumber && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-red-700">
                  DOCUMENTO ANULADO MEDIANTE NOTA CRÉDITO {order.creditNoteNumber}
                </p>
                <p className="text-[11px] text-red-600">
                  {order.motivoNotaCredito || 'Reversión contable y reintegro de unidades a bodega.'}{' '}
                  {order.fechaNotaCredito ? `· Fecha: ${order.fechaNotaCredito}` : ''}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-red-600 text-white font-mono font-bold text-[11px] shrink-0">
                {order.creditNoteNumber}
              </span>
            </div>
          )}

          {/* Client & Billing Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F5F5F7] p-4 rounded-2xl">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Datos del Cliente
              </p>
              <p className="font-bold text-[#111111] text-xs">{order.clienteNombre}</p>
              <p className="text-zinc-500 text-[11px]">
                Cédula / NIT:{' '}
                <strong className="text-[#111111] font-mono">
                  {order.clienteDocumento || '222222222222 (Consumidor Final)'}
                </strong>
              </p>
              {order.clienteTelefono && (
                <p className="text-zinc-500 text-[11px]">Teléfono: {order.clienteTelefono}</p>
              )}
              <p className="text-zinc-600 text-[11px]">Dirección: {order.clienteDireccion}</p>
            </div>

            <div className="space-y-1 sm:text-right">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Condiciones de Operación · Cartagena
              </p>
              <p className="text-zinc-600 text-[11px] flex sm:justify-end items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[#111111]" />
                <span>Medio de Pago:</span>
                <strong className="text-[#111111]">{order.metodoPagoInterno}</strong>
              </p>
              <p className="text-zinc-500 text-[11px]">
                Canal de Venta: <strong className="text-[#111111]">{order.origen}</strong>
              </p>
              {order.transportadora && (
                <p className="text-zinc-500 text-[11px]">
                  Transportadora: <strong className="text-[#111111]">{order.transportadora}</strong>
                  {order.guiaSeguimiento ? ` (${order.guiaSeguimiento})` : ''}
                </p>
              )}
              <p className="text-[11px] flex sm:justify-end items-center gap-1 mt-1">
                <PackageCheck className="w-3.5 h-3.5 text-[#111111]" />
                <span className="font-semibold text-[#111111]">
                  {order.stockDeducted
                    ? 'Unidades descontadas de inventario'
                    : 'Reserva pendiente de facturar'}
                </span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Detalle de Productos Facturados
            </p>
            <div className="border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F5F7] text-zinc-500 border-b border-zinc-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Cant.</th>
                    <th className="py-2.5 px-2">Descripción / Variante</th>
                    <th className="py-2.5 px-2 text-right">V. Unitario</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {order.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#111111] tabular-nums">
                        {it.cantidad}
                      </td>
                      <td className="py-2.5 px-2">
                        <p className="font-bold text-[#111111]">{it.nombre}</p>
                        <p className="text-[11px] text-zinc-500">
                          Talla: <strong className="text-[#111111]">{it.talla}</strong> · Color:{' '}
                          {it.color} · {it.diseno_motivo}
                        </p>
                      </td>
                      <td className="py-2.5 px-2 text-right text-zinc-600 tabular-nums">
                        {formatCOP(it.precio)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#111111] tabular-nums">
                        {formatCOP(it.precio * it.cantidad)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Breakdown with DIAN / Odoo ERP Tax Calculation */}
          {(() => {
            const netGoods = Math.max(0, order.subtotal - (order.descuentoManual || 0));
            const tax = calculateTaxBreakdown(netGoods, order.ivaPorcentaje ?? 19);
            const baseGravable = order.baseGravable ?? tax.baseGravable;
            const impuestoIva = order.impuestoIva ?? tax.impuestoIva;
            const ivaRate = order.ivaPorcentaje ?? tax.ivaPorcentaje;

            return (
              <div className="bg-[#F5F5F7] p-4 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>
                    Subtotal Bruto ({order.items.reduce((a, b) => a + b.cantidad, 0)} un.)
                  </span>
                  <span className="font-semibold text-[#111111] tabular-nums">
                    {formatCOP(order.subtotal)}
                  </span>
                </div>
                {order.descuentoManual && order.descuentoManual > 0 ? (
                  <div className="flex justify-between text-zinc-700 font-medium">
                    <span>Descuento Comercial Aplicado</span>
                    <span className="tabular-nums">-{formatCOP(order.descuentoManual)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-zinc-500 pt-1 border-t border-zinc-200/70">
                  <span>Base Gravable (Sin IVA)</span>
                  <span className="font-mono text-[#111111] tabular-nums">
                    {formatCOP(baseGravable)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Impuesto IVA ({ivaRate}% Incluido)</span>
                  <span className="font-mono text-[#111111] tabular-nums">
                    {formatCOP(impuestoIva)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Costo de Envío / Domicilio</span>
                  <span className="text-[#111111] tabular-nums">
                    {order.costoEnvio > 0 ? formatCOP(order.costoEnvio) : order.envioTexto}
                  </span>
                </div>
                <div className="border-t border-zinc-200 pt-2.5 flex justify-between text-sm font-extrabold text-[#111111]">
                  <span>TOTAL FACTURADO (COP)</span>
                  <span className="text-base tabular-nums">{formatCOP(order.total)}</span>
                </div>
              </div>
            );
          })()}

          {order.notas && (
            <div className="p-3 rounded-xl bg-[#F5F5F7] text-[11px] text-zinc-600">
              <strong className="text-[#111111]">Observaciones: </strong>
              {order.notas}
            </div>
          )}

          <div className="text-center text-[10px] text-zinc-400 pt-1">
            <p>Comprobante generado por el Sistema Interno de Facturación</p>
            <p className="text-[#111111] font-mono break-all mt-0.5">{order.referenceUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
