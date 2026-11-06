import fs from 'fs';
import path from 'path';
import {
  Producto,
  Order,
  CartItem,
  StoreConfig,
  PluginConnector,
  StoreNotification,
  EstadoPedido,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  DEFAULT_STORE_CONFIG,
  INITIAL_PLUGINS,
  INITIAL_NOTIFICATIONS,
} from './data';

const DB_FILE_PATH = path.join('/tmp', 'lasanta_store_db_v5.json');

export interface ServerDatabase {
  products: Producto[];
  orders: Order[];
  storeConfig: StoreConfig;
  plugins: PluginConnector[];
  notifications: StoreNotification[];
  updatedAt: string;
}

export function getFormattedNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

export function isStockCommittedState(estado: EstadoPedido): boolean {
  return estado === 'Facturado' || estado === 'Despachado' || estado === 'Entregado';
}

export function getInitialDb(): ServerDatabase {
  return {
    products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
    orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
    storeConfig: JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIG)),
    plugins: JSON.parse(JSON.stringify(INITIAL_PLUGINS)),
    notifications: JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS)),
    updatedAt: new Date().toISOString(),
  };
}

export function readDb(): ServerDatabase {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ServerDatabase>;
      return {
        products: parsed.products || INITIAL_PRODUCTS,
        orders: parsed.orders || INITIAL_ORDERS,
        storeConfig: { ...DEFAULT_STORE_CONFIG, ...(parsed.storeConfig || {}) },
        plugins: parsed.plugins || INITIAL_PLUGINS,
        notifications: parsed.notifications || INITIAL_NOTIFICATIONS,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Error reading server DB, initializing fresh state:', err);
  }
  const initial = getInitialDb();
  writeDb(initial);
  return initial;
}

export function writeDb(db: ServerDatabase): ServerDatabase {
  const updated = {
    ...db,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server DB:', err);
  }
  return updated;
}

/**
 * Reconciles product variant stock when transitioning from oldItems (if oldDeducted)
 * to newItems (if newDeducted).
 */
export function reconcileStockItems(
  products: Producto[],
  oldItems: CartItem[],
  oldDeducted: boolean,
  newItems: CartItem[],
  newDeducted: boolean
): { success: boolean; products: Producto[]; errorMessage?: string } {
  // Clone products
  const nextProducts: Producto[] = JSON.parse(JSON.stringify(products));

  // 1. If old items were deducted, restore them first to get the available baseline
  if (oldDeducted) {
    for (const item of oldItems) {
      const prod = nextProducts.find((p) => p.id === item.productoId);
      const variant = prod?.variantes.find((v) => v.id_variante === item.varianteId);
      if (variant) {
        variant.stock_disponible += item.cantidad;
      }
    }
  }

  // 2. If new items must be deducted, validate availability and deduct
  if (newDeducted) {
    for (const item of newItems) {
      const prod = nextProducts.find((p) => p.id === item.productoId);
      const variant = prod?.variantes.find((v) => v.id_variante === item.varianteId);
      if (!variant) {
        return {
          success: false,
          products,
          errorMessage: `La variante de ${item.nombre} (${item.talla}) ya no existe en el inventario.`,
        };
      }
      if (variant.stock_disponible < item.cantidad) {
        return {
          success: false,
          products,
          errorMessage: `Stock insuficiente para ${item.nombre} (Talla ${item.talla} · ${item.color}). Disponible: ${variant.stock_disponible} un.`,
        };
      }
      variant.stock_disponible = Math.max(0, variant.stock_disponible - item.cantidad);
    }
  }

  return { success: true, products: nextProducts };
}

/**
 * Generates a push notification event when an order changes to 'Despachado' or 'Entregado'.
 */
export function createOrderStatusNotification(
  order: Order,
  nuevoEstado: 'Despachado' | 'Entregado'
): StoreNotification {
  const refCode = order.invoiceNumber
    ? `${order.orderNumber} (${order.invoiceNumber})`
    : order.orderNumber;
  const guiaInfo = order.guiaSeguimiento
    ? ` · Guía: ${order.guiaSeguimiento}${order.transportadora ? ` (${order.transportadora})` : ''}`
    : '';

  const titulo =
    nuevoEstado === 'Despachado'
      ? `¡Tu pedido ${order.orderNumber} ha sido Despachado!`
      : `¡Tu pedido ${order.orderNumber} fue Entregado!`;

  const mensaje =
    nuevoEstado === 'Despachado'
      ? `Hola ${order.clienteNombre}, tu pedido ${refCode} ya salió de nuestro centro de operaciones en Cartagena de Indias rumbo a ${order.clienteDireccion}${guiaInfo}.`
      : `Hola ${order.clienteNombre}, confirmamos que tu pedido ${refCode} ha sido entregado exitosamente en ${order.clienteDireccion}. ¡Gracias por tu compra!`;

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    clienteNombre: order.clienteNombre,
    estado: nuevoEstado,
    titulo,
    mensaje,
    fecha: getFormattedNow(),
    leida: false,
    guiaSeguimiento: order.guiaSeguimiento,
    transportadora: order.transportadora,
  };
}
