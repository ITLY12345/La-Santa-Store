import mysql from 'mysql2/promise';

const globalForMysql = globalThis as unknown as {
  __lasantaErpMysqlPool?: mysql.Pool | null;
};

export function isMySqlConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.DB_HOST &&
        process.env.DB_USER &&
        process.env.DB_PASSWORD &&
        process.env.DB_NAME)
  );
}

export function getMySqlPool(): mysql.Pool {
  if (!globalForMysql.__lasantaErpMysqlPool) {
    globalForMysql.__lasantaErpMysqlPool = process.env.DATABASE_URL
      ? mysql.createPool({
          uri: process.env.DATABASE_URL,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        })
      : mysql.createPool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        });
  }
  return globalForMysql.__lasantaErpMysqlPool;
}

/**
 * DDL de inicialización automática para MySQL 8.0 / MariaDB en Hostinger (Estándar Odoo ERP)
 */
export const INITIALIZE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS erp_store_config (
  id INT PRIMARY KEY DEFAULT 1,
  store_name VARCHAR(120) NOT NULL,
  store_nit VARCHAR(30) NOT NULL,
  store_phone VARCHAR(30) NOT NULL,
  store_address VARCHAR(255) NOT NULL,
  store_city VARCHAR(100) NOT NULL,
  corporate_tagline TEXT NOT NULL,
  admin_pin_hash VARCHAR(255) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL DEFAULT '$',
  delivery_note VARCHAR(120) NOT NULL,
  invoice_prefix VARCHAR(15) NOT NULL DEFAULT 'FAC',
  next_invoice_sequence INT NOT NULL DEFAULT 1003,
  tax_rate_percent DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS erp_products (
  id VARCHAR(64) PRIMARY KEY,
  referencia VARCHAR(64) NOT NULL,
  nombre VARCHAR(180) NOT NULL,
  categoria ENUM('Chanclas', 'Camisetas', 'Bolsos') NOT NULL,
  marca_motivo VARCHAR(120) NOT NULL,
  descripcion TEXT NOT NULL,
  imagenes_json LONGTEXT NOT NULL,
  costo_unitario INT NOT NULL DEFAULT 0,
  precio_base INT NOT NULL,
  impuesto_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  stock_minimo_alerta INT NOT NULL DEFAULT 4,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS erp_product_variants (
  id_variante VARCHAR(64) PRIMARY KEY,
  producto_id VARCHAR(64) NOT NULL,
  sku VARCHAR(64) NOT NULL,
  talla VARCHAR(32) NOT NULL,
  color VARCHAR(64) NOT NULL,
  diseno_motivo VARCHAR(120) NOT NULL,
  stock_fisico INT NOT NULL DEFAULT 0,
  stock_reservado INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_variant_product FOREIGN KEY (producto_id)
    REFERENCES erp_products(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS erp_invoices_orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL,
  invoice_number VARCHAR(32) NULL,
  credit_note_number VARCHAR(32) NULL,
  origen ENUM('WhatsApp', 'POS Interno') NOT NULL,
  estado ENUM('Borrador', 'Pendiente', 'Confirmado', 'Facturado', 'Despachado', 'Entregado', 'Cancelado', 'Nota Crédito') NOT NULL,
  cliente_nombre VARCHAR(160) NOT NULL,
  cliente_documento VARCHAR(40) DEFAULT '',
  cliente_telefono VARCHAR(40) DEFAULT '',
  cliente_direccion VARCHAR(255) NOT NULL,
  transportadora VARCHAR(80) DEFAULT '',
  guia_seguimiento VARCHAR(80) DEFAULT '',
  subtotal_base INT NOT NULL,
  impuesto_iva INT NOT NULL DEFAULT 0,
  costo_envio INT NOT NULL DEFAULT 0,
  descuento_manual INT NOT NULL DEFAULT 0,
  total INT NOT NULL,
  metodo_pago VARCHAR(60) NOT NULL,
  stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  notas TEXT,
  fecha_creacion VARCHAR(40) NOT NULL,
  fecha_facturacion VARCHAR(40) NULL,
  fecha_despacho VARCHAR(40) NULL,
  fecha_entrega VARCHAR(40) NULL
);
CREATE TABLE IF NOT EXISTS erp_stock_moves (
  id VARCHAR(64) PRIMARY KEY,
  variante_id VARCHAR(64) NOT NULL,
  sku VARCHAR(64) DEFAULT '',
  producto_nombre VARCHAR(180) DEFAULT '',
  order_id VARCHAR(64) NULL,
  documento_ref VARCHAR(64) DEFAULT '',
  tipo_movimiento VARCHAR(64) NOT NULL,
  cantidad INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_resultante INT NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  fecha VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_variante_fecha (variante_id, created_at)
);
`;

