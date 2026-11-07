import fs from 'fs';
import os from 'os';
import path from 'path';
import mysql from 'mysql2/promise';
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

// Persistent storage outside the Next.js build output so CI/CD re-deployments never wipe local mirror
const EXTERNAL_PERSISTENT_DIR =
  process.env.PERSISTENT_DATA_DIR || path.join(os.homedir(), '.lasanta_store_persistent');
const PRIMARY_DATA_DIR = path.join(process.cwd(), 'data');
const PRIMARY_DB_PATH = path.join(PRIMARY_DATA_DIR, 'lasanta_store_db_v5.json');
const EXTERNAL_DB_PATH = path.join(EXTERNAL_PERSISTENT_DIR, 'lasanta_store_db_v5.json');
const FALLBACK_DB_PATH = path.join(os.tmpdir(), 'lasanta_store_db_v5.json');

export interface ServerDatabase {
  products: Producto[];
  orders: Order[];
  storeConfig: StoreConfig;
  plugins: PluginConnector[];
  notifications: StoreNotification[];
  updatedAt: string;
}

const globalForDb = globalThis as unknown as {
  __lasantaMemoryCache?: ServerDatabase | null;
  __lasantaMysqlPool?: mysql.Pool | null;
  __lasantaMysqlInitialized?: boolean;
  __lasantaMysqlHydrated?: boolean;
  __lasantaWriteQueue?: Promise<unknown>;
};

function isMySqlConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
  );
}

function getMySqlPool(): mysql.Pool | null {
  if (!isMySqlConfigured()) return null;
  if (globalForDb.__lasantaMysqlPool) {
    return globalForDb.__lasantaMysqlPool;
  }

  try {
    const pool = process.env.DATABASE_URL
      ? mysql.createPool({
          uri: process.env.DATABASE_URL,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 8000,
        })
      : mysql.createPool({
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 8000,
        });

    globalForDb.__lasantaMysqlPool = pool;
    return pool;
  } catch (err) {
    console.error('Failed to create MySQL connection pool:', err);
    return null;
  }
}

async function ensureMySqlSchema(pool: mysql.Pool): Promise<void> {
  if (globalForDb.__lasantaMysqlInitialized) return;

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS lasanta_store_state (
      id INT PRIMARY KEY DEFAULT 1,
      version BIGINT NOT NULL DEFAULT 1,
      products_json LONGTEXT NOT NULL,
      orders_json LONGTEXT NOT NULL,
      store_config_json LONGTEXT NOT NULL,
      plugins_json LONGTEXT NOT NULL,
      notifications_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS lasanta_orders_ledger (
      id VARCHAR(64) PRIMARY KEY,
      order_number VARCHAR(32) NOT NULL,
      invoice_number VARCHAR(32) NULL,
      origen VARCHAR(32) NOT NULL,
      estado VARCHAR(32) NOT NULL,
      cliente_nombre VARCHAR(160) NOT NULL,
      cliente_documento VARCHAR(64) NULL,
      cliente_telefono VARCHAR(64) NULL,
      subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
      costo_envio DECIMAL(14,2) NOT NULL DEFAULT 0,
      descuento DECIMAL(14,2) NOT NULL DEFAULT 0,
      total DECIMAL(14,2) NOT NULL DEFAULT 0,
      metodo_pago VARCHAR(64) NULL,
      stock_deducted TINYINT(1) NOT NULL DEFAULT 0,
      fecha VARCHAR(32) NOT NULL,
      payload_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order_number (order_number),
      INDEX idx_invoice_number (invoice_number),
      INDEX idx_estado (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS lasanta_products_catalog (
      id VARCHAR(64) PRIMARY KEY,
      referencia VARCHAR(64) NOT NULL,
      nombre VARCHAR(160) NOT NULL,
      categoria VARCHAR(64) NOT NULL,
      precio_base DECIMAL(14,2) NOT NULL DEFAULT 0,
      stock_total INT NOT NULL DEFAULT 0,
      payload_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_categoria (categoria),
      INDEX idx_referencia (referencia)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  globalForDb.__lasantaMysqlInitialized = true;
}

function resolveDbFilePaths(): string[] {
  const paths: string[] = [];
  try {
    if (!fs.existsSync(EXTERNAL_PERSISTENT_DIR)) {
      fs.mkdirSync(EXTERNAL_PERSISTENT_DIR, { recursive: true });
    }
    paths.push(EXTERNAL_DB_PATH);
  } catch {
    // ignore if homedir is not writable
  }

  try {
    if (!fs.existsSync(PRIMARY_DATA_DIR)) {
      fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
    }
    paths.push(PRIMARY_DB_PATH);
  } catch {
    paths.push(FALLBACK_DB_PATH);
  }

  return paths.length > 0 ? paths : [FALLBACK_DB_PATH];
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
    products: structuredClone(INITIAL_PRODUCTS),
    orders: structuredClone(INITIAL_ORDERS),
    storeConfig: structuredClone(DEFAULT_STORE_CONFIG),
    plugins: structuredClone(INITIAL_PLUGINS),
    notifications: structuredClone(INITIAL_NOTIFICATIONS),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeLoadedDb(parsed: Partial<ServerDatabase>): ServerDatabase {
  return {
    products: Array.isArray(parsed.products) ? parsed.products : INITIAL_PRODUCTS,
    orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_ORDERS,
    storeConfig: { ...DEFAULT_STORE_CONFIG, ...(parsed.storeConfig || {}) },
    plugins: Array.isArray(parsed.plugins) ? parsed.plugins : INITIAL_PLUGINS,
    notifications: Array.isArray(parsed.notifications)
      ? parsed.notifications
      : INITIAL_NOTIFICATIONS,
    updatedAt: parsed.updatedAt || new Date().toISOString(),
  };
}

function writeDiskMirror(updated: ServerDatabase): void {
  const serialized = JSON.stringify(updated, null, 2);
  for (const targetPath of resolveDbFilePaths()) {
    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tempPath, serialized, 'utf-8');
      fs.renameSync(tempPath, targetPath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        // ignore cleanup
      }
      try {
        fs.writeFileSync(targetPath, serialized, 'utf-8');
      } catch {
        // ignore secondary mirror error
      }
    }
  }
}

async function persistToMySqlTransactional(db: ServerDatabase): Promise<void> {
  const pool = getMySqlPool();
  if (!pool) return;

  await ensureMySqlSchema(pool);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO lasanta_store_state (
        id, version, products_json, orders_json, store_config_json, plugins_json, notifications_json
      ) VALUES (1, 1, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        version = version + 1,
        products_json = VALUES(products_json),
        orders_json = VALUES(orders_json),
        store_config_json = VALUES(store_config_json),
        plugins_json = VALUES(plugins_json),
        notifications_json = VALUES(notifications_json)`,
      [
        JSON.stringify(db.products),
        JSON.stringify(db.orders),
        JSON.stringify(db.storeConfig),
        JSON.stringify(db.plugins),
        JSON.stringify(db.notifications),
      ]
    );

    // Sync relational catalog table
    for (const prod of db.products) {
      const totalStock = (prod.variantes || []).reduce(
        (acc, v) => acc + (Number(v.stock_disponible) || 0),
        0
      );
      await conn.execute(
        `INSERT INTO lasanta_products_catalog (
          id, referencia, nombre, categoria, precio_base, stock_total, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          referencia = VALUES(referencia),
          nombre = VALUES(nombre),
          categoria = VALUES(categoria),
          precio_base = VALUES(precio_base),
          stock_total = VALUES(stock_total),
          payload_json = VALUES(payload_json)`,
        [
          prod.id.slice(0, 64),
          (prod.referencia || 'REF-GEN').slice(0, 64),
          prod.nombre.slice(0, 160),
          prod.categoria.slice(0, 64),
          Number(prod.precio_base) || 0,
          totalStock,
          JSON.stringify(prod),
        ]
      );
    }

    // Sync relational orders/invoices ledger
    for (const ord of db.orders) {
      await conn.execute(
        `INSERT INTO lasanta_orders_ledger (
          id, order_number, invoice_number, origen, estado,
          cliente_nombre, cliente_documento, cliente_telefono,
          subtotal, costo_envio, descuento, total, metodo_pago,
          stock_deducted, fecha, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          order_number = VALUES(order_number),
          invoice_number = VALUES(invoice_number),
          estado = VALUES(estado),
          cliente_nombre = VALUES(cliente_nombre),
          cliente_documento = VALUES(cliente_documento),
          cliente_telefono = VALUES(cliente_telefono),
          subtotal = VALUES(subtotal),
          costo_envio = VALUES(costo_envio),
          descuento = VALUES(descuento),
          total = VALUES(total),
          metodo_pago = VALUES(metodo_pago),
          stock_deducted = VALUES(stock_deducted),
          payload_json = VALUES(payload_json)`,
        [
          ord.id.slice(0, 64),
          ord.orderNumber.slice(0, 32),
          ord.invoiceNumber ? ord.invoiceNumber.slice(0, 32) : null,
          ord.origen.slice(0, 32),
          ord.estado.slice(0, 32),
          ord.clienteNombre.slice(0, 160),
          ord.clienteDocumento ? ord.clienteDocumento.slice(0, 64) : null,
          ord.clienteTelefono ? ord.clienteTelefono.slice(0, 64) : null,
          Number(ord.subtotal) || 0,
          Number(ord.costoEnvio) || 0,
          Number(ord.descuentoManual) || 0,
          Number(ord.total) || 0,
          ord.metodoPagoInterno ? ord.metodoPagoInterno.slice(0, 64) : null,
          ord.stockDeducted ? 1 : 0,
          ord.fecha.slice(0, 32),
          JSON.stringify(ord),
        ]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function enqueueMySqlWrite(db: ServerDatabase): Promise<void> {
  const prev = globalForDb.__lasantaWriteQueue || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => persistToMySqlTransactional(db))
    .catch((err) => {
      console.error('MySQL write-through error:', err);
    });
  globalForDb.__lasantaWriteQueue = next;
  return next;
}

export function readDb(): ServerDatabase {
  if (globalForDb.__lasantaMemoryCache) {
    return structuredClone(globalForDb.__lasantaMemoryCache);
  }

  for (const candidatePath of resolveDbFilePaths()) {
    try {
      if (fs.existsSync(candidatePath)) {
        const raw = fs.readFileSync(candidatePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<ServerDatabase>;
        const loaded = normalizeLoadedDb(parsed);
        globalForDb.__lasantaMemoryCache = loaded;
        return structuredClone(loaded);
      }
    } catch (err) {
      console.error(`Error reading DB mirror at ${candidatePath}:`, err);
    }
  }

  const initial = getInitialDb();
  writeDb(initial);
  return initial;
}

/**
 * Reads the canonical state from Hostinger MySQL (u219318007_lasanta) if configured,
 * falling back to the persistent local mirror when running offline.
 */
export async function readDbAsync(): Promise<ServerDatabase> {
  const pool = getMySqlPool();
  if (pool) {
    try {
      await ensureMySqlSchema(pool);
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT products_json, orders_json, store_config_json, plugins_json, notifications_json, updated_at FROM lasanta_store_state WHERE id = 1 LIMIT 1'
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        const loaded = normalizeLoadedDb({
          products: JSON.parse(row.products_json),
          orders: JSON.parse(row.orders_json),
          storeConfig: JSON.parse(row.store_config_json),
          plugins: JSON.parse(row.plugins_json),
          notifications: JSON.parse(row.notifications_json),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
        });
        globalForDb.__lasantaMemoryCache = loaded;
        globalForDb.__lasantaMysqlHydrated = true;
        return structuredClone(loaded);
      } else {
        // Seed MySQL database from existing mirror or initial state
        const seed = readDb();
        await persistToMySqlTransactional(seed);
        globalForDb.__lasantaMysqlHydrated = true;
        return seed;
      }
    } catch (err) {
      console.error('MySQL read error, falling back to local mirror:', err);
    }
  }
  return readDb();
}

/**
 * Atomically persists database to memory cache, external disk mirror, and Hostinger MySQL.
 */
export function writeDb(db: ServerDatabase): ServerDatabase {
  const updated: ServerDatabase = {
    ...db,
    updatedAt: new Date().toISOString(),
  };
  globalForDb.__lasantaMemoryCache = structuredClone(updated);
  writeDiskMirror(updated);

  if (isMySqlConfigured()) {
    void enqueueMySqlWrite(updated);
  }
  return updated;
}

/**
 * Async transactional write that awaits Hostinger MySQL persistence before returning.
 */
export async function writeDbAsync(db: ServerDatabase): Promise<ServerDatabase> {
  const updated: ServerDatabase = {
    ...db,
    updatedAt: new Date().toISOString(),
  };
  globalForDb.__lasantaMemoryCache = structuredClone(updated);
  writeDiskMirror(updated);

  if (isMySqlConfigured()) {
    await enqueueMySqlWrite(updated);
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
  const nextProducts: Producto[] = structuredClone(products);

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
