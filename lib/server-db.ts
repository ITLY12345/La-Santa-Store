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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')} ${String(
    now.getHours()
  ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
  const products = (
    Array.isArray(parsed.products) ? parsed.products : INITIAL_PRODUCTS
  ).map((p) => ({
    ...p,
    variantes: (p.variantes || []).map((v) => {
      const disp = Math.max(0, Number(v.stock_disponible) || 0);
      const res = Math.max(0, Number(v.stock_reservado) || 0);
      const fis =
        typeof v.stock_fisico === 'number' && v.stock_fisico >= disp
          ? v.stock_fisico
          : disp + res;
      return {
        ...v,
        talla: (v.talla || '').replace(/\s+/g, ' ').trim(),
        color: (v.color || '').replace(/\s+/g, ' ').trim(),
        diseno_motivo: '',
        stock_fisico: fis,
        stock_reservado: res,
        stock_disponible: disp,
      };
    }),
  }));

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

async function persistToMySqlTransactional(db: ServerDatabase): Promise<void> {
  if (!isMySqlConfigured()) return;
  const pool = getMySqlPool();

  await ensureMySqlSchema(pool);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Canonical state snapshot
    await conn.execute(
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

    // 2. Sync erp_store_config (res.config.settings)
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
        (db.storeConfig.storePhone || '573105559876').slice(0, 30),
        (db.storeConfig.storeAddress || 'Cartagena de Indias').slice(0, 255),
        (db.storeConfig.storeCity || 'Cartagena de Indias').slice(0, 100),
        db.storeConfig.corporateTagline || '',
        pinHash,
        (db.storeConfig.currencySymbol || '$').slice(0, 10),
        (db.storeConfig.deliveryNote || '').slice(0, 120),
        (db.storeConfig.prefijoFactura || 'FAC').slice(0, 15),
        Number(db.storeConfig.nextInvoiceSequence || 1003),
        Number(db.storeConfig.taxRatePercent ?? 19),
      ]
    );

    // 3. Sync erp_products & erp_product_variants (product.template & stock.quant)
    for (const prod of db.products) {
      await conn.execute(
        `INSERT INTO erp_products (
          id, referencia, nombre, categoria, marca_motivo, descripcion,
          imagenes_json, costo_unitario, precio_base, impuesto_porcentaje,
          stock_minimo_alerta, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
          referencia = VALUES(referencia),
          nombre = VALUES(nombre),
          categoria = VALUES(categoria),
          marca_motivo = VALUES(marca_motivo),
          descripcion = VALUES(descripcion),
          imagenes_json = VALUES(imagenes_json),
          costo_unitario = VALUES(costo_unitario),
          precio_base = VALUES(precio_base),
          impuesto_porcentaje = VALUES(impuesto_porcentaje),
          stock_minimo_alerta = VALUES(stock_minimo_alerta)`,
        [
          prod.id.slice(0, 64),
          (prod.referencia || `REF-${prod.id}`).slice(0, 64),
          prod.nombre.slice(0, 180),
          prod.categoria,
          (prod.marca_motivo || 'Colección Oficial').slice(0, 120),
          prod.descripcion || '',
          JSON.stringify(prod.imagenes || []),
          Number(prod.costo_unitario || 0),
          Number(prod.precio_base || 0),
          Number(prod.iva_porcentaje ?? 19),
          Number(prod.configuracion_alertas?.stock_minimo_alerta ?? 4),
        ]
      );

      for (const v of prod.variantes || []) {
        const disp = Math.max(0, Number(v.stock_disponible) || 0);
        const res = Math.max(0, Number(v.stock_reservado) || 0);
        const fis =
          typeof v.stock_fisico === 'number' && v.stock_fisico >= disp
            ? v.stock_fisico
            : disp + res;
        await conn.execute(
          `INSERT INTO erp_product_variants (
            id_variante, producto_id, sku, talla, color, diseno_motivo,
            stock_fisico, stock_reservado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            sku = VALUES(sku),
            talla = VALUES(talla),
            color = VALUES(color),
            diseno_motivo = VALUES(diseno_motivo),
            stock_fisico = VALUES(stock_fisico),
            stock_reservado = VALUES(stock_reservado)`,
          [
            v.id_variante.slice(0, 64),
            prod.id.slice(0, 64),
            (v.sku || v.id_variante).slice(0, 64),
            v.talla.slice(0, 32),
            v.color.slice(0, 64),
            '',
            fis,
            res,
          ]
        );
      }
    }

    // 4. Sync erp_invoices_orders (sale.order & account.move)
    for (const ord of db.orders) {
      await conn.execute(
        `INSERT INTO erp_invoices_orders (
          id, order_number, invoice_number, credit_note_number, origen, estado,
          cliente_nombre, cliente_documento, cliente_telefono, cliente_direccion,
          transportadora, guia_seguimiento, subtotal_base, impuesto_iva,
          costo_envio, descuento_manual, total, metodo_pago, stock_deducted,
          notas, fecha_creacion, fecha_facturacion, fecha_despacho, fecha_entrega
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          invoice_number = VALUES(invoice_number),
          credit_note_number = VALUES(credit_note_number),
          estado = VALUES(estado),
          cliente_nombre = VALUES(cliente_nombre),
          cliente_documento = VALUES(cliente_documento),
          cliente_telefono = VALUES(cliente_telefono),
          cliente_direccion = VALUES(cliente_direccion),
          transportadora = VALUES(transportadora),
          guia_seguimiento = VALUES(guia_seguimiento),
          subtotal_base = VALUES(subtotal_base),
          impuesto_iva = VALUES(impuesto_iva),
          costo_envio = VALUES(costo_envio),
          descuento_manual = VALUES(descuento_manual),
          total = VALUES(total),
          metodo_pago = VALUES(metodo_pago),
          stock_deducted = VALUES(stock_deducted),
          notas = VALUES(notas),
          fecha_facturacion = VALUES(fecha_facturacion),
          fecha_despacho = VALUES(fecha_despacho),
          fecha_entrega = VALUES(fecha_entrega)`,
        [
          ord.id.slice(0, 64),
          ord.orderNumber.slice(0, 32),
          ord.invoiceNumber ? ord.invoiceNumber.slice(0, 32) : null,
          ord.creditNoteNumber ? ord.creditNoteNumber.slice(0, 32) : null,
          ord.origen,
          ord.estado,
          ord.clienteNombre.slice(0, 160),
          (ord.clienteDocumento || '').slice(0, 40),
          (ord.clienteTelefono || '').slice(0, 40),
          (ord.clienteDireccion || '').slice(0, 255),
          (ord.transportadora || '').slice(0, 80),
          (ord.guiaSeguimiento || '').slice(0, 80),
          Number(ord.baseGravable ?? ord.subtotal ?? 0),
          Number(ord.impuestoIva ?? 0),
          Number(ord.costoEnvio || 0),
          Number(ord.descuentoManual || 0),
          Number(ord.total || 0),
          (ord.metodoPagoInterno || 'Por definir').slice(0, 60),
          Boolean(ord.stockDeducted),
          ord.notas || '',
          ord.fecha.slice(0, 40),
          ord.fechaFacturacion ? ord.fechaFacturacion.slice(0, 40) : null,
          ord.fechaDespacho ? ord.fechaDespacho.slice(0, 40) : null,
          ord.fechaEntrega ? ord.fechaEntrega.slice(0, 40) : null,
        ]
      );
    }

    // 5. Sync recent erp_stock_moves (immutable Kardex)
    for (const mv of (db.stockMoves || []).slice(0, 200)) {
      await conn.execute(
        `INSERT IGNORE INTO erp_stock_moves (
          id, variante_id, sku, producto_nombre, order_id, documento_ref,
          tipo_movimiento, cantidad, stock_anterior, stock_resultante, motivo, fecha
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mv.id.slice(0, 64),
          mv.varianteId.slice(0, 64),
          (mv.sku || '').slice(0, 64),
          (mv.productoNombre || '').slice(0, 180),
          mv.orderId ? mv.orderId.slice(0, 64) : null,
          (mv.documentoRef || '').slice(0, 64),
          mv.tipoMovimiento,
          Number(mv.cantidad),
          Number(mv.stockAnterior),
          Number(mv.stockResultante),
          (mv.motivo || '').slice(0, 255),
          (mv.fecha || '').slice(0, 40),
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
  if (isMySqlConfigured()) {
    try {
      const pool = getMySqlPool();
      await ensureMySqlSchema(pool);
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT products_json, orders_json, store_config_json, plugins_json, notifications_json, stock_moves_json, updated_at FROM lasanta_store_state WHERE id = 1 LIMIT 1'
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        const loaded = normalizeLoadedDb({
          products: JSON.parse(row.products_json),
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
        variant.stock_fisico =
          (variant.stock_fisico ?? prevDisp) + item.cantidad;

        generatedMoves.push(
          buildKardexMove({
            varianteId: variant.id_variante,
            sku: variant.sku || variant.id_variante,
            productoNombre: prod.nombre,
            talla: variant.talla,
            color: variant.color,
            orderId: kardexContext?.orderId,
            documentoRef: kardexContext?.documentoRef || 'REINTEGRO',
            tipoMovimiento: 'DEVOLUCION_NC',
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
      if (variant.stock_disponible < item.cantidad) {
        return {
          success: false,
          products,
          generatedMoves: [],
          errorMessage: `Stock insuficiente para ${item.nombre} (Talla ${item.talla} · ${item.color}). Disponible: ${variant.stock_disponible} un.`,
        };
      }
      const prevDisp = variant.stock_disponible;
      variant.stock_disponible = Math.max(0, prevDisp - item.cantidad);
      variant.stock_fisico = Math.max(
        variant.stock_disponible + (variant.stock_reservado || 0),
        (variant.stock_fisico ?? prevDisp) - item.cantidad
      );

      generatedMoves.push(
        buildKardexMove({
          varianteId: variant.id_variante,
          sku: variant.sku || variant.id_variante,
          productoNombre: prod.nombre,
          talla: variant.talla,
          color: variant.color,
          orderId: kardexContext?.orderId,
          documentoRef: kardexContext?.documentoRef || 'POS-VENTA',
          tipoMovimiento: 'SALIDA_VENTA',
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
