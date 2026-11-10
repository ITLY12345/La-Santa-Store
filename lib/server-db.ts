import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import mysql from 'mysql2/promise';
import {
  isMySqlConfigured,
  getMySqlPool,
  INITIALIZE_SCHEMA_SQL,
} from './mysql-db';
import {
  Producto,
  Order,
  CartItem,
  StoreConfig,
  PluginConnector,
  StoreNotification,
  EstadoPedido,
  StockMove,
  TipoMovimientoKardex,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  DEFAULT_STORE_CONFIG,
  INITIAL_PLUGINS,
  INITIAL_NOTIFICATIONS,
  INITIAL_STOCK_MOVES,
} from './data';

// Persistent storage outside the Next.js build output so CI/CD re-deployments never wipe local mirror
const EXTERNAL_PERSISTENT_DIR =
  process.env.PERSISTENT_DATA_DIR ||
  path.join(os.homedir(), '.lasanta_store_persistent');
const PRIMARY_DATA_DIR = path.join(process.cwd(), 'data');
const PRIMARY_DB_PATH = path.join(PRIMARY_DATA_DIR, 'lasanta_store_db_v5.json');
const EXTERNAL_DB_PATH = path.join(
  EXTERNAL_PERSISTENT_DIR,
  'lasanta_store_db_v5.json'
);
const FALLBACK_DB_PATH = path.join(os.tmpdir(), 'lasanta_store_db_v5.json');

export interface ServerDatabase {
  products: Producto[];
  orders: Order[];
  storeConfig: StoreConfig;
  plugins: PluginConnector[];
  notifications: StoreNotification[];
  stockMoves: StockMove[];
  updatedAt: string;
}

const globalForDb = globalThis as unknown as {
  __lasantaMemoryCache?: ServerDatabase | null;
  __lasantaMysqlInitialized?: boolean;
  __lasantaMysqlHydrated?: boolean;
  __lasantaWriteQueue?: Promise<unknown>;
};

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
      stock_moves_json LONGTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure stock_moves_json column exists if table was created in an earlier migration
  try {
    await pool.execute(
      `ALTER TABLE lasanta_store_state ADD COLUMN stock_moves_json LONGTEXT NULL`
    );
  } catch {
    // Column already exists
  }

  // Initialize the 5 relational Odoo ERP tables (Section 5.3)
  const ddlStatements = INITIALIZE_SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of ddlStatements) {
    try {
      await pool.execute(stmt);
    } catch (err) {
      console.warn('DDL statement warning:', err);
    }
  }

  try {
    await pool.execute(
      `ALTER TABLE erp_stock_moves MODIFY COLUMN tipo_movimiento VARCHAR(64) NOT NULL`
    );
  } catch {
    // ignore if already VARCHAR(64)
  }

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
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(new Date()).replace('T', ' ');
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')} ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}

export function isStockCommittedState(estado: EstadoPedido): boolean {
  return (
    estado === 'Facturado' ||
    estado === 'Despachado' ||
    estado === 'Entregado'
  );
}

export function getInitialDb(): ServerDatabase {
  return {
    products: structuredClone(INITIAL_PRODUCTS),
    orders: structuredClone(INITIAL_ORDERS),
    storeConfig: structuredClone(DEFAULT_STORE_CONFIG),
    plugins: structuredClone(INITIAL_PLUGINS),
    notifications: structuredClone(INITIAL_NOTIFICATIONS),
    stockMoves: structuredClone(INITIAL_STOCK_MOVES),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeLoadedDb(parsed: Partial<ServerDatabase>): ServerDatabase {
  const rawProducts = Array.isArray(parsed.products)
    ? parsed.products
    : INITIAL_PRODUCTS;

  const seenFingerprints = new Set<string>();
  const seenIds = new Set<string>();
  const products: Producto[] = [];

  for (const p of rawProducts) {
    if (!p || typeof p.id !== 'string') continue;
    if (seenIds.has(p.id)) continue;

    const cleanName = (p.nombre || '').replace(/\s+/g, ' ').trim();
    const firstImgSig = Array.isArray(p.imagenes) && p.imagenes[0]
      ? p.imagenes[0].slice(0, 120)
      : '';
    const fingerprint = `${cleanName.toLowerCase()}|${p.categoria}|${Number(p.precio_base) || 0}|${firstImgSig}`;
    if (seenFingerprints.has(fingerprint)) {
      continue;
    }
    seenIds.add(p.id);
    seenFingerprints.add(fingerprint);

    products.push({
      ...p,
      nombre: cleanName || p.nombre,
      variantes: (p.variantes || []).map((v) => {
        const disp = Math.max(0, Number(v.stock_disponible) || 0);
        const res = Math.max(0, Number(v.stock_reservado) || 0);
        const pos = Math.max(0, Number(v.stock_punto_venta) || 0);
        const consig = Math.max(0, Number(v.stock_consignacion) || 0);
        const fis =
          typeof v.stock_fisico === 'number' && v.stock_fisico >= disp + pos + consig
            ? v.stock_fisico
            : disp + res + pos + consig;
        return {
          ...v,
          talla: (v.talla || '').replace(/\s+/g, ' ').trim(),
          color: (v.color || '').replace(/\s+/g, ' ').trim(),
          diseno_motivo: '',
          stock_fisico: fis,
          stock_reservado: res,
          stock_disponible: disp,
          stock_punto_venta: pos,
          stock_consignacion: consig,
        };
      }),
    });
  }

  return {
    products,
    orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_ORDERS,
    storeConfig: { ...DEFAULT_STORE_CONFIG, ...(parsed.storeConfig || {}) },
    plugins: Array.isArray(parsed.plugins) ? parsed.plugins : INITIAL_PLUGINS,
    notifications: Array.isArray(parsed.notifications)
      ? parsed.notifications
      : INITIAL_NOTIFICATIONS,
    stockMoves: Array.isArray(parsed.stockMoves)
      ? parsed.stockMoves
      : INITIAL_STOCK_MOVES,
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

async function syncRelationalErpTablesInBackground(db: ServerDatabase): Promise<void> {
  if (!isMySqlConfigured()) return;
  const pool = getMySqlPool();
  const conn = await pool.getConnection();
  try {
    const pinHash = crypto
      .createHash('sha256')
      .update(db.storeConfig.adminPin || '1234')
      .digest('hex');
    await conn.execute(
      `INSERT INTO erp_store_config (
        id, store_name, store_nit, store_phone, store_address, store_city,
        corporate_tagline, admin_pin_hash, currency_symbol, delivery_note,
        invoice_prefix, next_invoice_sequence, tax_rate_percent
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        store_name = VALUES(store_name),
        store_nit = VALUES(store_nit),
        store_phone = VALUES(store_phone),
        store_address = VALUES(store_address),
        store_city = VALUES(store_city),
        corporate_tagline = VALUES(corporate_tagline),
        admin_pin_hash = VALUES(admin_pin_hash),
        currency_symbol = VALUES(currency_symbol),
        delivery_note = VALUES(delivery_note),
        invoice_prefix = VALUES(invoice_prefix),
        next_invoice_sequence = VALUES(next_invoice_sequence),
        tax_rate_percent = VALUES(tax_rate_percent)`,
      [
        (db.storeConfig.storeName || 'La Santa Store').slice(0, 120),
        (db.storeConfig.storeNit || '901.482.319-4').slice(0, 30),
        (db.storeConfig.storePhone || '573022241002').slice(0, 30),
        (db.storeConfig.storeAddress || '').slice(0, 255),
        (db.storeConfig.storeCity || '').slice(0, 100),
        db.storeConfig.corporateTagline || '',
        pinHash,
        (db.storeConfig.currencySymbol || '$').slice(0, 10),
        (db.storeConfig.deliveryNote || '').slice(0, 120),
        (db.storeConfig.prefijoFactura || 'FAC').slice(0, 15),
        Number(db.storeConfig.nextInvoiceSequence || 1003),
        Number(db.storeConfig.taxRatePercent ?? 19),
      ]
    );
  } catch (err) {
    console.warn('Secondary relational mirror sync warning:', err);
  } finally {
    conn.release();
  }
}

async function persistToMySqlTransactional(db: ServerDatabase): Promise<void> {
  if (!isMySqlConfigured()) return;
  const pool = getMySqlPool();

  await ensureMySqlSchema(pool);

  // 1. Fast atomic canonical state snapshot (~40ms single query, never blocked by secondary loops)
  await pool.execute(
    `INSERT INTO lasanta_store_state (
      id, version, products_json, orders_json, store_config_json, plugins_json, notifications_json, stock_moves_json
    ) VALUES (1, 1, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      version = version + 1,
      products_json = VALUES(products_json),
      orders_json = VALUES(orders_json),
      store_config_json = VALUES(store_config_json),
      plugins_json = VALUES(plugins_json),
      notifications_json = VALUES(notifications_json),
      stock_moves_json = VALUES(stock_moves_json)`,
    [
      JSON.stringify(db.products),
      JSON.stringify(db.orders),
      JSON.stringify(db.storeConfig),
      JSON.stringify(db.plugins),
      JSON.stringify(db.notifications),
      JSON.stringify(db.stockMoves || []),
    ]
  );

  // 2. Non-blocking background sync of secondary ERP config table
  void syncRelationalErpTablesInBackground(db);
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
  if (isMySqlConfigured()) {
    try {
      const pool = getMySqlPool();
      await ensureMySqlSchema(pool);
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT products_json, orders_json, store_config_json, plugins_json, notifications_json, stock_moves_json, updated_at FROM lasanta_store_state WHERE id = 1 LIMIT 1'
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        const rawProducts = JSON.parse(row.products_json);
        const loaded = normalizeLoadedDb({
          products: rawProducts,
          orders: JSON.parse(row.orders_json),
          storeConfig: JSON.parse(row.store_config_json),
          plugins: JSON.parse(row.plugins_json),
          notifications: JSON.parse(row.notifications_json),
          stockMoves: row.stock_moves_json
            ? JSON.parse(row.stock_moves_json)
            : [],
          updatedAt: row.updated_at
            ? new Date(row.updated_at).toISOString()
            : new Date().toISOString(),
        });
        if (
          Array.isArray(rawProducts) &&
          rawProducts.length !== loaded.products.length
        ) {
          void enqueueMySqlWrite(loaded);
        }
        globalForDb.__lasantaMemoryCache = loaded;
        globalForDb.__lasantaMysqlHydrated = true;
        return structuredClone(loaded);
      } else {
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

export async function writeDbAsync(
  db: ServerDatabase
): Promise<ServerDatabase> {
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
 * Creates a standardized immutable Kardex entry (erp_stock_moves / stock.move).
 */
export function buildKardexMove(params: {
  varianteId: string;
  sku: string;
  productoNombre: string;
  talla: string;
  color: string;
  orderId?: string;
  documentoRef: string;
  tipoMovimiento: TipoMovimientoKardex;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  motivo: string;
}): StockMove {
  return {
    id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    varianteId: params.varianteId,
    sku: params.sku,
    productoNombre: params.productoNombre,
    talla: params.talla,
    color: params.color,
    orderId: params.orderId,
    documentoRef: params.documentoRef,
    tipoMovimiento: params.tipoMovimiento,
    cantidad: params.cantidad,
    stockAnterior: params.stockAnterior,
    stockResultante: params.stockResultante,
    motivo: params.motivo,
    fecha: getFormattedNow(),
  };
}

/**
 * Reconciles product variant stock (stock_fisico, stock_reservado, stock_disponible)
 * and generates immutable Kardex entries (StockMove[]).
 */
export function reconcileStockItems(
  products: Producto[],
  oldItems: CartItem[],
  oldDeducted: boolean,
  newItems: CartItem[],
  newDeducted: boolean,
  kardexContext?: {
    orderId?: string;
    documentoRef?: string;
    motivoSalida?: string;
    motivoReintegro?: string;
    ubicacionDespacho?: 'Bodega Principal' | 'Punto de Venta POS';
    modalidadVenta?: 'Detal' | 'Mayorista' | 'Crédito' | 'Consignación';
  }
): {
  success: boolean;
  products: Producto[];
  generatedMoves: StockMove[];
  errorMessage?: string;
} {
  const nextProducts: Producto[] = structuredClone(products);
  const generatedMoves: StockMove[] = [];

  // 1. If old items were deducted, restore them first to get the available baseline
  if (oldDeducted) {
    for (const item of oldItems) {
      const prod = nextProducts.find((p) => p.id === item.productoId);
      const variant = prod?.variantes.find(
        (v) => v.id_variante === item.varianteId
      );
      if (prod && variant) {
        const prevDisp = variant.stock_disponible;
        variant.stock_disponible += item.cantidad;
        if (kardexContext?.modalidadVenta === 'Consignación') {
          variant.stock_consignacion = Math.max(
            0,
            (variant.stock_consignacion || 0) - item.cantidad
          );
        }
        variant.stock_fisico =
          variant.stock_disponible +
          (variant.stock_reservado || 0) +
          (variant.stock_punto_venta || 0) +
          (variant.stock_consignacion || 0);

        generatedMoves.push(
          buildKardexMove({
            varianteId: variant.id_variante,
            sku: variant.sku || variant.id_variante,
            productoNombre: prod.nombre,
            talla: variant.talla,
            color: variant.color,
            orderId: kardexContext?.orderId,
            documentoRef: kardexContext?.documentoRef || 'REINTEGRO',
            tipoMovimiento:
              kardexContext?.modalidadVenta === 'Consignación'
                ? 'RETORNO_CONSIGNACION'
                : 'DEVOLUCION_NC',
            cantidad: item.cantidad,
            stockAnterior: prevDisp,
            stockResultante: variant.stock_disponible,
            motivo:
              kardexContext?.motivoReintegro ||
              `Reintegro de inventario (${kardexContext?.documentoRef || 'NC'})`,
          })
        );
      }
    }
  }

  // 2. If new items must be deducted, validate availability and deduct
  if (newDeducted) {
    for (const item of newItems) {
      const prod = nextProducts.find((p) => p.id === item.productoId);
      const variant = prod?.variantes.find(
        (v) => v.id_variante === item.varianteId
      );
      if (!prod || !variant) {
        return {
          success: false,
          products,
          generatedMoves: [],
          errorMessage: `La variante de ${item.nombre} (${item.talla}) ya no existe en el inventario.`,
        };
      }
      const dispBodega = variant.stock_disponible || 0;
      const dispPos = variant.stock_punto_venta || 0;
      const totalSellable = dispBodega + dispPos;

      if (totalSellable < item.cantidad) {
        return {
          success: false,
          products,
          generatedMoves: [],
          errorMessage: `Stock insuficiente para ${item.nombre} (Talla ${item.talla} · ${item.color}). Disponible total (Bodega + POS): ${totalSellable} un.`,
        };
      }

      const prevDisp = variant.stock_disponible;
      if (kardexContext?.ubicacionDespacho === 'Punto de Venta POS' && dispPos > 0) {
        const deductFromPos = Math.min(dispPos, item.cantidad);
        const deductFromBodega = item.cantidad - deductFromPos;
        variant.stock_punto_venta = Math.max(0, dispPos - deductFromPos);
        variant.stock_disponible = Math.max(0, dispBodega - deductFromBodega);
      } else {
        const deductFromBodega = Math.min(dispBodega, item.cantidad);
        const deductFromPos = item.cantidad - deductFromBodega;
        variant.stock_disponible = Math.max(0, dispBodega - deductFromBodega);
        variant.stock_punto_venta = Math.max(0, dispPos - deductFromPos);
      }

      if (kardexContext?.modalidadVenta === 'Consignación') {
        variant.stock_consignacion =
          (variant.stock_consignacion || 0) + item.cantidad;
      }

      variant.stock_fisico =
        variant.stock_disponible +
        (variant.stock_reservado || 0) +
        (variant.stock_punto_venta || 0) +
        (variant.stock_consignacion || 0);

      generatedMoves.push(
        buildKardexMove({
          varianteId: variant.id_variante,
          sku: variant.sku || variant.id_variante,
          productoNombre: prod.nombre,
          talla: variant.talla,
          color: variant.color,
          orderId: kardexContext?.orderId,
          documentoRef: kardexContext?.documentoRef || 'POS-VENTA',
          tipoMovimiento:
            kardexContext?.modalidadVenta === 'Consignación'
              ? 'SALIDA_CONSIGNACION'
              : 'SALIDA_VENTA',
          cantidad: -item.cantidad,
          stockAnterior: prevDisp,
          stockResultante: variant.stock_disponible,
          motivo:
            kardexContext?.motivoSalida ||
            `Salida por facturación (${kardexContext?.documentoRef || 'FAC'})`,
        })
      );
    }
  }

  return { success: true, products: nextProducts, generatedMoves };
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
    ? ` · Guía: ${order.guiaSeguimiento}${
        order.transportadora ? ` (${order.transportadora})` : ''
      }`
    : '';

  const firstName = (order.clienteNombre || 'Cliente').trim().split(/\s+/)[0];
  const ciudadDestino = (order.clienteDireccion || '').split(',').pop()?.trim().slice(0, 30) || 'tu dirección';

  const titulo =
    nuevoEstado === 'Despachado'
      ? `¡Tu pedido ${order.orderNumber} ha sido Despachado!`
      : `¡Tu pedido ${order.orderNumber} fue Entregado!`;

  const mensaje =
    nuevoEstado === 'Despachado'
      ? `Hola ${firstName}, tu pedido ${refCode} ha sido despachado con destino a ${ciudadDestino}${guiaInfo}.`
      : `Hola ${firstName}, confirmamos que tu pedido ${refCode} ha sido entregado exitosamente. ¡Gracias por elegir La Santa Store!`;

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
