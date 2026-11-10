export interface Variante {
  id_variante: string;
  sku?: string;
  talla: string;
  color: string;
  diseno_motivo: string;
  stock_fisico?: number; // Unidades físicas totales (Bodega + POS + Consignación)
  stock_reservado?: number; // Unidades comprometidas en pedidos confirmados
  stock_disponible: number; // Unidades disponibles para venta (Bodega Principal / Web)
  stock_punto_venta?: number; // Unidades trasladadas y disponibles en Punto de Venta físico (POS)
  stock_consignacion?: number; // Unidades entregadas en Consignación a aliados/clientes
}

export interface Producto {
  id: string;
  referencia?: string;
  nombre: string;
  categoria: 'Chanclas' | 'Camisetas' | 'Bolsos';
  marca_motivo: string;
  descripcion: string;
  imagenes: string[];
  precio_base: number; // Precio al Detal (PVP)
  precio_mayorista?: number; // Precio al Mayor / Distribución / Consignación
  costo_unitario?: number; // Costo de adquisición/producción (COGS) para cálculo de margen bruto
  iva_porcentaje?: number; // Tarifa IVA (por defecto 19% Colombia)
  configuracion_alertas: {
    stock_minimo_alerta: number;
    stock_maximo_objetivo?: number; // Regla de reabastecimiento (stock.warehouse.orderpoint)
  };
  variantes: Variante[];
}

export type ModalidadVentaPOS =
  | 'Detal'
  | 'Mayorista'
  | 'Crédito'
  | 'Consignación';

export interface CartItem {
  cartItemId: string;
  productoId: string;
  varianteId: string;
  nombre: string;
  categoria: 'Chanclas' | 'Camisetas' | 'Bolsos';
  marca_motivo: string;
  talla: string;
  color: string;
  diseno_motivo: string;
  precio: number;
  cantidad: number;
  stockMaximo: number;
  imagen: string;
}

export type MetodoPagoInterno =
  | 'Efectivo'
  | 'Transferencia / Nequi'
  | 'Tarjeta / Datáfono'
  | 'Crédito / Plazo'
  | 'Consignación'
  | 'Contraentrega'
  | 'Por definir';

export type EstadoPedido =
  | 'Pendiente'
  | 'Confirmado'
  | 'Facturado'
  | 'Despachado'
  | 'Entregado'
  | 'Cancelado';

export type TipoMovimientoKardex =
  | 'ENTRADA_COMPRA'
  | 'RESERVA_PEDIDO'
  | 'LIBERACION_RESERVA'
  | 'SALIDA_VENTA'
  | 'DEVOLUCION_NC'
  | 'AJUSTE_INVENTARIO'
  | 'TRASLADO_BODEGA_POS'
  | 'SALIDA_CONSIGNACION'
  | 'RETORNO_CONSIGNACION';

export interface StockMove {
  id: string;
  varianteId: string;
  sku: string;
  productoNombre: string;
  talla: string;
  color: string;
  orderId?: string;
  documentoRef: string;
  tipoMovimiento: TipoMovimientoKardex;
  cantidad: number; // Delta firmado (+n o -n)
  stockAnterior: number;
  stockResultante: number;
  motivo: string;
  fecha: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber?: string; // Consecutivo oficial ej. FAC-1001
  creditNoteNumber?: string; // Nota Crédito oficial ej. NC-1001 (cuando se anula una factura en firme)
  fecha: string;
  fechaFacturacion?: string;
  fechaDespacho?: string;
  fechaEntrega?: string;
  fechaNotaCredito?: string;
  motivoNotaCredito?: string;
  origen: 'WhatsApp' | 'POS Interno';
  modalidadVenta?: ModalidadVentaPOS; // Detal, Mayorista, Crédito o Consignación
  ubicacionDespacho?: 'Bodega Principal' | 'Punto de Venta POS';
  montoAbonado?: number; // Monto pagado / abonado a la factura
  saldoPendiente?: number; // Saldo por cobrar en facturas a Crédito o Consignación
  fechaVencimiento?: string; // Fecha acuerdo de pago o corte de consignación
  clienteNombre: string;
  clienteDocumento?: string; // Cédula o NIT
  clienteDireccion: string;
  clienteTelefono: string;
  transportadora?: string;
  guiaSeguimiento?: string;
  items: CartItem[];
  subtotal: number;
  baseGravable?: number; // Base antes de IVA
  impuestoIva?: number; // IVA 19% incluido/desglosado
  ivaPorcentaje?: number;
  costoEnvio: number;
  descuentoManual?: number;
  envioTexto: string;
  total: number;
  estado: EstadoPedido;
  metodoPagoInterno: MetodoPagoInterno;
  referenciaPago?: string; // Comprobante Nequi / Datáfono / Transferencia
  stockReserved?: boolean; // Indica si las unidades están comprometidas en stock_reservado
  stockDeducted: boolean;
  notas?: string;
  referenceUrl: string;
}

export interface StoreNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  invoiceNumber?: string;
  clienteNombre: string;
  estado: 'Despachado' | 'Entregado';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  guiaSeguimiento?: string;
  transportadora?: string;
}

export interface PluginConnector {
  id: string;
  nombre: string;
  categoria: 'Pasarela de Pago' | 'Logística y Envíos' | 'Facturación & ERP' | 'Notificaciones';
  proveedor: string;
  descripcion: string;
  activo: boolean;
  modo: 'Sandbox / Pruebas' | 'Producción';
  publicKey?: string;
  webhookUrl: string;
  comisionTexto?: string;
  ultimaSincronizacion?: string;
}

export interface StoreConfig {
  storeName: string;
  storeNit: string;
  storePhone: string;
  storeAddress: string;
  storeCity: string;
  corporateTagline: string;
  adminPin: string;
  currencySymbol: string;
  deliveryNote: string;
  nextInvoiceSequence: number;
  nextCreditNoteSequence?: number;
  nextOrderSequence?: number;
  // Parámetros ERP / DIAN (res.config.settings)
  regimenTributario?: string;
  resolucionFacturacion?: string;
  prefijoFactura?: string;
  rangoAutorizado?: string;
  taxRatePercent?: number;
  tarifaEnvioCartagena?: number;
  tarifaEnvioNacional?: number;
  envioGratisDesde?: number;
  transportadorasActivas?: string;
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeName: 'La Santa Store',
  storeNit: '901.482.319-4',
  storePhone: '573022241002',
  storeAddress: 'Cartagena de Indias, Colombia · Despachos Nacionales',
  storeCity: 'Cartagena de Indias, Colombia',
  corporateTagline:
    'Firma colombiana de moda urbana y marroquinería contemporánea con centro de operaciones en Cartagena de Indias. Distribución nacional garantizada, control de existencias en tiempo real y atención personalizada.',
  adminPin: '1234',
  currencySymbol: '$',
  deliveryNote: '(Despacho desde Cartagena · A convenir)',
  nextInvoiceSequence: 1003,
  nextCreditNoteSequence: 1001,
  nextOrderSequence: 1000,
  regimenTributario: 'Responsable de IVA (19%)',
  resolucionFacturacion: 'Resolución DIAN 18764000012345 · Vigencia 2026',
  prefijoFactura: 'FAC',
  rangoAutorizado: 'FAC-1000 a FAC-9999',
  taxRatePercent: 19,
  tarifaEnvioCartagena: 8000,
  tarifaEnvioNacional: 16000,
  envioGratisDesde: 200000,
  transportadorasActivas:
    'Coordinadora, Envía, Inter Rapidísimo, Domicilio Express Cartagena',
};

export const INITIAL_PLUGINS: PluginConnector[] = [
  {
    id: 'plg-wompi',
    nombre: 'Wompi Bancolombia',
    categoria: 'Pasarela de Pago',
    proveedor: 'Bancolombia / Wompi',
    descripcion: 'Pagos con PSE, Nequi, Tarjetas de Crédito/Débito y Botón Bancolombia vía Webhook.',
    activo: false,
    modo: 'Sandbox / Pruebas',
    publicKey: 'pub_test_wompi_ctg_2026',
    webhookUrl: '/api/webhooks?provider=wompi',
    comisionTexto: '2.65% + $700 COP',
    ultimaSincronizacion: 'Listo para conectar llaves de producción',
  },
  {
    id: 'plg-bold',
    nombre: 'Bold Pagos en Línea y Datáfono',
    categoria: 'Pasarela de Pago',
    proveedor: 'Bold.co',
    descripcion: 'Links de cobro y sincronización con datáfonos inteligentes en punto de venta Cartagena.',
    activo: false,
    modo: 'Sandbox / Pruebas',
    publicKey: 'bold_live_ctg_pos_key',
    webhookUrl: '/api/webhooks?provider=bold',
    comisionTexto: '2.89% + $800 COP',
    ultimaSincronizacion: 'Conector API preparado',
  },
  {
    id: 'plg-mercadopago',
    nombre: 'Mercado Pago Checkout Pro',
    categoria: 'Pasarela de Pago',
    proveedor: 'Mercado Libre',
    descripcion: 'Procesamiento de tarjetas, Efecty y cuotas sin interés con confirmación automática.',
    activo: false,
    modo: 'Sandbox / Pruebas',
    publicKey: 'APP_USR-mp-colombia-2026',
    webhookUrl: '/api/webhooks?provider=mercadopago',
    comisionTexto: '3.19% + $800 COP',
    ultimaSincronizacion: 'Conector API preparado',
  },
  {
    id: 'plg-coordinadora',
    nombre: 'Coordinadora Mercantil · Despachos Cartagena',
    categoria: 'Logística y Envíos',
    proveedor: 'Coordinadora',
    descripcion: 'Generación de guías automáticas desde Cartagena de Indias hacia todo el país y alertas de despacho.',
    activo: true,
    modo: 'Producción',
    publicKey: 'CTG-HUB-05001',
    webhookUrl: '/api/webhooks?provider=coordinadora',
    comisionTexto: 'Tarifa corporativa nacional',
    ultimaSincronizacion: 'Activo · Centro Logístico Cartagena',
  },
  {
    id: 'plg-envia',
    nombre: 'Envía Colvanes · Costa Caribe & Nacional',
    categoria: 'Logística y Envíos',
    proveedor: 'Envía',
    descripcion: 'Rutas exprés desde Cartagena hacia Barranquilla, Santa Marta, Medellín, Bogotá y Cali.',
    activo: true,
    modo: 'Producción',
    publicKey: 'ENV-CTG-9921',
    webhookUrl: '/api/webhooks?provider=envia',
    comisionTexto: 'Tarifa preferencial Caribe',
    ultimaSincronizacion: 'Activo · Sincronizado con estados de pedido',
  },
  {
    id: 'plg-push-sw',
    nombre: 'Motor de Notificaciones Push & Seguimiento',
    categoria: 'Notificaciones',
    proveedor: 'Web Push API Nativo',
    descripcion: 'Envía alertas instantáneas al navegador del cliente cuando su pedido pasa a Despachado o Entregado.',
    activo: true,
    modo: 'Producción',
    publicKey: 'VAPID-NATIVE-BROWSER-PUSH',
    webhookUrl: '/api/orders',
    comisionTexto: 'Incluido en el núcleo',
    ultimaSincronizacion: 'Operativo en tiempo real',
  },
];

export const INITIAL_PRODUCTS: Producto[] = [
  {
    id: 'prod-001',
    referencia: 'REF-SLD-01',
    nombre: 'Chanclas Mate Esencial',
    categoria: 'Chanclas',
    marca_motivo: 'Línea Esencial',
    descripcion:
      'Sandalias de descanso de diseño ergonómico minimalista en espuma EVA de alta densidad con suela antideslizante y plantilla anatómica.',
    imagenes: [
      'https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=800&q=85',
    ],
    precio_base: 85000,
    costo_unitario: 38000,
    iva_porcentaje: 19,
    configuracion_alertas: {
      stock_minimo_alerta: 4,
    },
    variantes: [
      {
        id_variante: 'var-001-1',
        sku: 'SLD-NEG-38',
        talla: '38',
        color: 'Negro Mate',
        diseno_motivo: 'Mate Minimalista',
        stock_disponible: 14,
      },
      {
        id_variante: 'var-001-2',
        sku: 'SLD-NEG-39',
        talla: '39',
        color: 'Negro Mate',
        diseno_motivo: 'Mate Minimalista',
        stock_disponible: 3,
      },
      {
        id_variante: 'var-001-3',
        sku: 'SLD-NEG-40',
        talla: '40',
        color: 'Negro Mate',
        diseno_motivo: 'Mate Minimalista',
        stock_disponible: 8,
      },
      {
        id_variante: 'var-001-4',
        sku: 'SLD-NEG-41',
        talla: '41',
        color: 'Negro Mate',
        diseno_motivo: 'Mate Minimalista',
        stock_disponible: 0,
      },
      {
        id_variante: 'var-001-5',
        sku: 'SLD-BLA-39',
        talla: '39',
        color: 'Blanco Hueso',
        diseno_motivo: 'Estudio Limpio',
        stock_disponible: 5,
      },
      {
        id_variante: 'var-001-6',
        sku: 'SLD-BLA-40',
        talla: '40',
        color: 'Blanco Hueso',
        diseno_motivo: 'Estudio Limpio',
        stock_disponible: 2,
      },
    ],
  },
  {
    id: 'prod-002',
    referencia: 'REF-CAM-02',
    nombre: 'Camiseta Algodón Pesado',
    categoria: 'Camisetas',
    marca_motivo: 'Colección Estudio',
    descripcion:
      'Camiseta de corte amplio arquitectónico confeccionada en algodón peinado de 240g con caída estructurada y cuello acanalado reforzado.',
    imagenes: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85',
    ],
    precio_base: 95000,
    costo_unitario: 42000,
    iva_porcentaje: 19,
    configuracion_alertas: {
      stock_minimo_alerta: 5,
    },
    variantes: [
      {
        id_variante: 'var-002-1',
        sku: 'CAM-BLA-S',
        talla: 'S',
        color: 'Blanco Puro',
        diseno_motivo: 'Estudio Minimal',
        stock_disponible: 9,
      },
      {
        id_variante: 'var-002-2',
        sku: 'CAM-BLA-M',
        talla: 'M',
        color: 'Blanco Puro',
        diseno_motivo: 'Estudio Minimal',
        stock_disponible: 4,
      },
      {
        id_variante: 'var-002-3',
        sku: 'CAM-BLA-L',
        talla: 'L',
        color: 'Blanco Puro',
        diseno_motivo: 'Estudio Minimal',
        stock_disponible: 12,
      },
      {
        id_variante: 'var-002-4',
        sku: 'CAM-BLA-XL',
        talla: 'XL',
        color: 'Blanco Puro',
        diseno_motivo: 'Estudio Minimal',
        stock_disponible: 1,
      },
      {
        id_variante: 'var-002-5',
        sku: 'CAM-GRI-M',
        talla: 'M',
        color: 'Gris Piedra',
        diseno_motivo: 'Monocromo',
        stock_disponible: 6,
      },
      {
        id_variante: 'var-002-6',
        sku: 'CAM-GRI-L',
        talla: 'L',
        color: 'Gris Piedra',
        diseno_motivo: 'Monocromo',
        stock_disponible: 0,
      },
    ],
  },
  {
    id: 'prod-003',
    referencia: 'REF-BOL-03',
    nombre: 'Bolso Cruzado Técnico',
    categoria: 'Bolsos',
    marca_motivo: 'Utilidad Urbana',
    descripcion:
      'Bolso cruzado minimalista en tejido técnico impermeable, herrajes mate de cierre rápido, correa ajustable y compartimento acolchado.',
    imagenes: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=85',
    ],
    precio_base: 110000,
    costo_unitario: 49000,
    iva_porcentaje: 19,
    configuracion_alertas: {
      stock_minimo_alerta: 3,
    },
    variantes: [
      {
        id_variante: 'var-003-1',
        sku: 'BOL-NEG-U',
        talla: 'Única',
        color: 'Negro Carbón',
        diseno_motivo: 'Acabado Mate',
        stock_disponible: 7,
      },
      {
        id_variante: 'var-003-2',
        sku: 'BOL-GRA-U',
        talla: 'Única',
        color: 'Gris Grafito',
        diseno_motivo: 'Edición Limpia',
        stock_disponible: 2,
      },
      {
        id_variante: 'var-003-3',
        sku: 'BOL-ARE-U',
        talla: 'Única',
        color: 'Arena Neutro',
        diseno_motivo: 'Correa Ajustable',
        stock_disponible: 0,
      },
    ],
  },
  {
    id: 'prod-004',
    referencia: 'REF-CAM-04',
    nombre: 'Camiseta Corte Monocromo',
    categoria: 'Camisetas',
    marca_motivo: 'Básicos Esenciales',
    descripcion:
      'Prenda esencial de silueta relajada y hombros caídos en tejido suave transpirable. Diseño limpio sin costuras visibles en el frontal.',
    imagenes: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=85',
    ],
    precio_base: 98000,
    costo_unitario: 44000,
    iva_porcentaje: 19,
    configuracion_alertas: {
      stock_minimo_alerta: 4,
    },
    variantes: [
      {
        id_variante: 'var-004-1',
        sku: 'CMO-NEG-S',
        talla: 'S',
        color: 'Negro Mate',
        diseno_motivo: 'Esencial Puro',
        stock_disponible: 6,
      },
      {
        id_variante: 'var-004-2',
        sku: 'CMO-NEG-M',
        talla: 'M',
        color: 'Negro Mate',
        diseno_motivo: 'Esencial Puro',
        stock_disponible: 10,
      },
      {
        id_variante: 'var-004-3',
        sku: 'CMO-NEG-L',
        talla: 'L',
        color: 'Negro Mate',
        diseno_motivo: 'Esencial Puro',
        stock_disponible: 3,
      },
      {
        id_variante: 'var-004-4',
        sku: 'CMO-NEG-XL',
        talla: 'XL',
        color: 'Negro Mate',
        diseno_motivo: 'Esencial Puro',
        stock_disponible: 5,
      },
    ],
  },
  {
    id: 'prod-005',
    referencia: 'REF-SLD-05',
    nombre: 'Chanclas Espuma Confort',
    categoria: 'Chanclas',
    marca_motivo: 'Serie Confort',
    descripcion:
      'Sandalias de descanso con plataforma amortiguada de memoria viscoelástica y banda superior suave de una sola pieza.',
    imagenes: [
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=85',
    ],
    precio_base: 89000,
    costo_unitario: 39000,
    iva_porcentaje: 19,
    configuracion_alertas: {
      stock_minimo_alerta: 4,
    },
    variantes: [
      {
        id_variante: 'var-005-1',
        sku: 'SCF-ARE-38',
        talla: '38',
        color: 'Arena Piedra',
        diseno_motivo: 'Espuma Suave',
        stock_disponible: 8,
      },
      {
        id_variante: 'var-005-2',
        sku: 'SCF-ARE-39',
        talla: '39',
        color: 'Arena Piedra',
        diseno_motivo: 'Espuma Suave',
        stock_disponible: 7,
      },
      {
        id_variante: 'var-005-3',
        sku: 'SCF-ARE-40',
        talla: '40',
        color: 'Arena Piedra',
        diseno_motivo: 'Espuma Suave',
        stock_disponible: 2,
      },
      {
        id_variante: 'var-005-4',
        sku: 'SCF-ARE-41',
        talla: '41',
        color: 'Arena Piedra',
        diseno_motivo: 'Espuma Suave',
        stock_disponible: 6,
      },
    ],
  },
  {
    id: 'prod-006',
    referencia: 'REF-BOL-06',
    nombre: 'Bolso Bandolera Diario',
    categoria: 'Bolsos',
    marca_motivo: 'Porte Minimalista',
    descripcion:
      'Bandolera compacta de perfil limpio para uso diario, acabado en piel sintética mate y bolsillo magnético oculto.',
    imagenes: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=85',
    ],
    precio_base: 79000,
    costo_unitario: 35000,
    iva_porcentaje: 19,
    configuracion_alertas: {
      stock_minimo_alerta: 3,
    },
    variantes: [
      {
        id_variante: 'var-006-1',
        sku: 'BBD-NEG-U',
        talla: 'Única',
        color: 'Negro Satinado',
        diseno_motivo: 'Diario Limpio',
        stock_disponible: 11,
      },
      {
        id_variante: 'var-006-2',
        sku: 'BBD-GRI-U',
        talla: 'Única',
        color: 'Gris Humo',
        diseno_motivo: 'Edición Estudio',
        stock_disponible: 1,
      },
    ],
  },
];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_NOTIFICATIONS: StoreNotification[] = [];

export const INITIAL_STOCK_MOVES: StockMove[] = [];

export function formatCOP(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0';
  const rounded = Math.round(amount).toString();
  const withDots = rounded.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${withDots}`;
}

/**
 * Formatea un valor numérico o cadena en un input con separadores de miles colombianos (ej. 80.000).
 * Si el valor es 0 o vacío y allowEmptyZero es true, devuelve '' para evitar el bloqueo del cursor en '0'.
 */
export function formatThousandsInput(
  value: number | string | null | undefined,
  allowEmptyZero = true
): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    if (isNaN(value) || (value === 0 && allowEmptyZero)) return '';
    return Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num) || (num === 0 && allowEmptyZero && digits === '0')) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Convierte cualquier cadena con puntos, comas o símbolos de moneda (ej. "$80.000") a entero limpio.
 */
export function parseNumericInput(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : Math.max(0, Math.round(raw));
  if (!raw) return 0;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Calcula el desglose contable de Base Gravable + IVA (estándar DIAN Colombia / Odoo ERP).
 */
export function calculateTaxBreakdown(
  netGoodsAmount: number,
  ivaRate = 19
): { baseGravable: number; impuestoIva: number; ivaPorcentaje: number } {
  const safeNet = Math.max(0, Math.round(Number(netGoodsAmount) || 0));
  const rate = Math.max(0, Number(ivaRate) || 19);
  const baseGravable = Math.round(safeNet / (1 + rate / 100));
  const impuestoIva = Math.max(0, safeNet - baseGravable);
  return { baseGravable, impuestoIva, ivaPorcentaje: rate };
}
