import { CartItem, formatCOP } from './data';

export interface WhatsAppOrderPayload {
  orderNumber?: string;
  items: CartItem[];
  subtotal: number;
  costoEnvio?: number;
  envioTexto?: string;
  total: number;
  clienteNombre?: string;
  clienteDireccion?: string;
  clienteTelefono?: string;
  referenceUrl?: string;
}

/**
 * Builds the exact structured text for La Santa Store WhatsApp order message
 */
export function generateWhatsAppMessage(
  payload: WhatsAppOrderPayload,
  storePhone: string
): { messageText: string; waLink: string } {
  const {
    orderNumber,
    items,
    subtotal,
    costoEnvio = 0,
    envioTexto,
    total,
    clienteNombre,
    clienteDireccion,
    clienteTelefono,
    referenceUrl,
  } = payload;

  const itemsLines = items
    .map((item) => {
      const descriptor =
        item.marca_motivo && item.color
          ? `[${item.marca_motivo} / ${item.color}]`
          : `[${item.diseno_motivo || item.color}]`;

      return `- ${item.cantidad}x ${item.categoria} ${descriptor} - Talla: ${item.talla} (${formatCOP(
        item.precio * item.cantidad
      )})`;
    })
    .join('\n');

  const nameVal =
    clienteNombre && clienteNombre.trim()
      ? clienteNombre.trim()
      : 'Cliente La Santa Store';
  const phoneVal =
    clienteTelefono && clienteTelefono.trim()
      ? clienteTelefono.trim()
      : 'Confirmar por este chat';
  const addressVal =
    clienteDireccion && clienteDireccion.trim()
      ? clienteDireccion.trim()
      : 'Cartagena de Indias';

  const shippingLabel =
    costoEnvio > 0
      ? `${formatCOP(costoEnvio)}${envioTexto ? ` (${envioTexto})` : ''}`
      : `Gratis ($0)${envioTexto ? ` · ${envioTexto}` : ''}`;

  const refUrl =
    referenceUrl ||
    `https://lasantastore.enigmaproducciones.com/pedido/LS-${Date.now()
      .toString()
      .slice(-6)}`;

  const orderHeader = orderNumber ? ` (Orden ${orderNumber})` : '';

  const messageText = `¡Hola La Santa Store! 👑 Quiero confirmar mi pedido${orderHeader}:

🛍️ DETALLE DEL PEDIDO:
${itemsLines}

💵 Subtotal: ${formatCOP(subtotal)}
🚚 Envío: ${shippingLabel}
💰 TOTAL A PAGAR: ${formatCOP(total)}

👤 DATOS DE DESPACHO:
- Nombre: ${nameVal}
- Teléfono: ${phoneVal}
- Dirección / Ciudad: ${addressVal}

Link de referencia del pedido: ${refUrl}`;

  const cleanPhone = storePhone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(messageText);
  const waLink = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  return { messageText, waLink };
}
