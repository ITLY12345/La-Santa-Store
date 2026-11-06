import { CartItem, formatCOP } from './data';

export interface WhatsAppOrderPayload {
  items: CartItem[];
  subtotal: number;
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
  const { items, subtotal, total, clienteNombre, clienteDireccion, referenceUrl } = payload;

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
    clienteNombre && clienteNombre.trim() ? clienteNombre.trim() : '[Espacio para cliente]';
  const addressVal =
    clienteDireccion && clienteDireccion.trim() ? clienteDireccion.trim() : '[Espacio para cliente]';

  const refUrl = referenceUrl || `https://lasanta.store/pedido/LS-${Date.now().toString().slice(-6)}`;

  const messageText = `¡Hola La Santa Store! 👑 Me interesa realizar el siguiente pedido:

🛍️ DETALLE DEL PEDIDO:
${itemsLines}

💵 Subtotal: ${formatCOP(subtotal)}
🚚 Envío: (A convenir)
💰 TOTAL ESTIMADO: ${formatCOP(total)}

👤 DATOS DE ENVÍO:
- Nombre: ${nameVal}
- Dirección: ${addressVal}

Link de referencia del carrito: ${refUrl}`;

  const cleanPhone = storePhone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(messageText);
  const waLink = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  return { messageText, waLink };
}
