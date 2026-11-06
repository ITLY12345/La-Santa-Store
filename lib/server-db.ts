import fs from 'fs';
import os from 'os';
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

const PRIMARY_DATA_DIR = path.join(process.cwd(), 'data');
const PRIMARY_DB_PATH = path.join(PRIMARY_DATA_DIR, 'lasanta_store_db_v5.json');
const FALLBACK_DB_PATH = path.join(os.tmpdir(), 'lasanta_store_db_v5.json');

let memoryDbCache: ServerDatabase | null = null;

function resolveDbFilePath(): string {
  try {
    if (!fs.existsSync(PRIMARY_DATA_DIR)) {
      fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
    }
    return PRIMARY_DB_PATH;
  } catch {
    return FALLBACK_DB_PATH;
  }
}

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
  const dbPath = resolveDbFilePath();
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ServerDatabase>;
      const loaded: ServerDatabase = {
        products: Array.isArray(parsed.products) ? parsed.products : INITIAL_PRODUCTS,
        orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_ORDERS,
        storeConfig: { ...DEFAULT_STORE_CONFIG, ...(parsed.storeConfig || {}) },
        plugins: Array.isArray(parsed.plugins) ? parsed.plugins : INITIAL_PLUGINS,
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications
          : INITIAL_NOTIFICATIONS,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
      memoryDbCache = loaded;
      return loaded;
    }
  } catch (err) {
    console.error('Error reading server DB, using cache or initializing fresh state:', err);
    if (memoryDbCache) {
      return JSON.parse(JSON.stringify(memoryDbCache));
    }
  }
  const initial = getInitialDb();
  writeDb(initial);
  return initial;
}

/**
 * Atomically persists database to disk using write-then-rename to prevent corruption
 * under concurrent requests.
 */
export function writeDb(db: ServerDatabase): ServerDatabase {
  const updated: ServerDatabase = {
    ...db,
    updatedAt: new Date().toISOString(),
  };
  memoryDbCache = JSON.parse(JSON.stringify(updated));

  const dbPath = resolveDbFilePath();
  const tempPath = `${dbPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    const serialized = JSON.stringify(updated, null, 2);
    fs.writeFileSync(tempPath, serialized, 'utf-8');
    fs.renameSync(tempPath, dbPath);
  } catch (err) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // ignore cleanup error
    }
    try {
      fs.writeFileSync(dbPath, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (fallbackErr) {
      console.error('Error writing server DB:', fallbackErr);
    }
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
