'use client';

import React, { createContext, useContext, useState, useMemo, useRef, useCallback } from 'react';
import {
  Producto,
  Variante,
  CartItem,
  Order,
  ModalidadVentaPOS,
  MetodoPagoInterno,
  EstadoPedido,
  StoreConfig,
  PluginConnector,
  StoreNotification,
  StockMove,
  INITIAL_PRODUCTS,
  DEFAULT_STORE_CONFIG,
  INITIAL_PLUGINS,
  formatCOP,
} from './data';

const STORAGE_KEY_PRODUCTS = 'lasanta_store_products_v6';
const STORAGE_KEY_CART = 'lasanta_store_cart_v6';
const STORAGE_KEY_FAVORITES = 'lasanta_store_favorites_v6';
const STORAGE_KEY_MY_ORDER_IDS = 'lasanta_my_order_ids_v6';

// Legacy insecure keys to purge from browsers on startup
const LEGACY_KEYS_TO_PURGE = [
  'lasanta_store_orders_v5',
  'lasanta_store_config_v5',
  'lasanta_store_notifications_v5',
  'lasanta_store_plugins_v5',
  'lasanta_admin_auth_v5',
];

const PUBLIC_SAFE_DEFAULT_CONFIG: StoreConfig = {
  ...DEFAULT_STORE_CONFIG,
  adminPin: '',
};

export interface CriticalAlertItem {
  producto: Producto;
  variante: Variante;
  deficit: number;
}

interface StoreContextType {
  products: Producto[];
  cart: CartItem[];
  orders: Order[];
  favorites: string[];
  storeConfig: StoreConfig;
  plugins: PluginConnector[];
  notifications: StoreNotification[];
  stockMoves: StockMove[];
  unreadNotificationsCount: number;
  activePushToast: StoreNotification | null;
  dismissPushToast: () => void;
  markAllNotificationsRead: () => void;
  browserPushPermission: NotificationPermission | 'unsupported';
  requestBrowserPushPermission: () => Promise<boolean>;
  triggerManualPushTest: (order: Order, estado: 'Despachado' | 'Entregado') => void;
  trackOrderByQuery: (query: string) => Promise<Order[]>;
  cartTotalCount: number;
  cartSubtotal: number;
  criticalAlerts: CriticalAlertItem[];
  isHydrated: boolean;
  isAdminAuthenticated: boolean;
  authenticateAdmin: (pin: string) => Promise<boolean>;
  logoutAdmin: () => void;
  // Favorites
  toggleFavorite: (productoId: string) => void;
  // Product & Inventory POS CRUD actions
  createProduct: (productData: Omit<Producto, 'id'>) => Promise<{
    success: boolean;
    product?: Producto;
    message?: string;
  }>;
  updateProduct: (updatedProduct: Producto) => Promise<{
    success: boolean;
    message?: string;
  }>;
  deleteProduct: (productoId: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  updateVariantStock: (productoId: string, varianteId: string, newStock: number) => void;
  transferWarehouseStock: (payload: {
    productoId: string;
    varianteId: string;
    tipo: 'BODEGA_A_POS' | 'POS_A_BODEGA' | 'SALIDA_CONSIGNACION' | 'RETORNO_CONSIGNACION';
    cantidad: number;
    destinoNombre?: string;
    precioUnitarioPactado?: number;
    notas?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  updateProductAlertThreshold: (productoId: string, newThreshold: number) => void;
  resetToInitialCatalog: () => void;
  // Cart actions
  addToCart: (item: Omit<CartItem, 'cartItemId'>) => { success: boolean; message?: string };
  updateCartQuantity: (cartItemId: string, newQty: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  // Order & Internal POS Billing CRUD actions
  createOrder: (payload: {
    clienteNombre: string;
    clienteDireccion: string;
    clienteTelefono: string;
    envioOpcion: 'recoger' | 'nacional' | 'cartagena' | 'local';
    notas?: string;
  }) => Promise<{ success: boolean; order?: Order; message?: string }>;
  createPosInvoice: (payload: {
    clienteNombre: string;
    clienteDocumento?: string;
    clienteTelefono?: string;
    clienteDireccion?: string;
    transportadora?: string;
    guiaSeguimiento?: string;
    items: CartItem[];
    costoEnvio: number;
    descuentoManual?: number;
    metodoPagoInterno: MetodoPagoInterno;
    modalidadVenta?: ModalidadVentaPOS;
    ubicacionDespacho?: 'Bodega Principal' | 'Punto de Venta POS';
    montoAbonado?: number;
    fechaVencimiento?: string;
    estado?: EstadoPedido;
    notas?: string;
  }) => { success: boolean; order?: Order; message?: string };
  emitirFacturaOrder: (
    orderId: string,
    billingPayload: {
      clienteNombre: string;
      clienteDocumento?: string;
      clienteTelefono?: string;
      clienteDireccion: string;
      transportadora?: string;
      guiaSeguimiento?: string;
      costoEnvio: number;
      descuentoManual?: number;
      metodoPagoInterno: MetodoPagoInterno;
      notas?: string;
    }
  ) => { success: boolean; order?: Order; message?: string };
  updateOrderFull: (
    orderId: string,
    payload: {
      clienteNombre: string;
      clienteDocumento?: string;
      clienteTelefono?: string;
      clienteDireccion: string;
      transportadora?: string;
      guiaSeguimiento?: string;
      items: CartItem[];
      costoEnvio: number;
      descuentoManual?: number;
      metodoPagoInterno: MetodoPagoInterno;
      modalidadVenta?: ModalidadVentaPOS;
      ubicacionDespacho?: 'Bodega Principal' | 'Punto de Venta POS';
      montoAbonado?: number;
      fechaVencimiento?: string;
      estado: EstadoPedido;
      notas?: string;
    }
  ) => { success: boolean; order?: Order; message?: string };
  registerOrderPayment: (
    orderId: string,
    abonoAdicional: number,
    metodoPago?: MetodoPagoInterno
  ) => { success: boolean; order?: Order; message?: string };
  deleteOrder: (orderId: string) => { success: boolean; message?: string };
  updateOrderStatus: (
    orderId: string,
    nuevoEstado: EstadoPedido,
    trackingInfo?: { transportadora?: string; guiaSeguimiento?: string }
  ) => void;
  // Plugins & Backend Connectors
  updatePluginConnector: (
    pluginId: string,
    updates: Partial<PluginConnector>
  ) => Promise<void>;
  // Config actions
  updateStoreConfig: (
    config: Partial<StoreConfig>,
    currentPin?: string
  ) => Promise<{ success: boolean; message?: string }>;
}

const StoreContext = createContext<StoreContextType | null>(null);

function getFormattedNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

function isStockCommitted(estado: EstadoPedido): boolean {
  return estado === 'Facturado' || estado === 'Despachado' || estado === 'Entregado';
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrderIds, setMyOrderIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(PUBLIC_SAFE_DEFAULT_CONFIG);
  const [plugins, setPlugins] = useState<PluginConnector[]>(INITIAL_PLUGINS);
  const [notifications, setNotifications] = useState<StoreNotification[]>([]);
  const [stockMoves, setStockMoves] = useState<StockMove[]>([]);
  const [activePushToast, setActivePushToast] = useState<StoreNotification | null>(null);
  const [browserPushPermission, setBrowserPushPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const myOrderIdsRef = useRef<string[]>([]);

  // Fire native browser push notification + in-app toast banner
  const dispatchNativeAndInAppPush = useCallback((notif: StoreNotification) => {
    setActivePushToast(notif);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready
              .then((reg) => {
                reg.showNotification(notif.titulo, {
                  body: notif.mensaje,
                  icon: '/assets/brand/logo-la-santa.png',
                  badge: '/assets/brand/logo-la-santa.png',
                  tag: notif.id,
                });
              })
              .catch(() => {
                new window.Notification(notif.titulo, {
                  body: notif.mensaje,
                  icon: '/assets/brand/logo-la-santa.png',
                });
              });
          } else {
            new window.Notification(notif.titulo, {
              body: notif.mensaje,
              icon: '/assets/brand/logo-la-santa.png',
            });
          }
        } catch (err) {
          console.error('Browser notification error:', err);
        }
      }
    }
  }, []);

  // Sync with Next.js Backend API (/api/store) and customer's own orders on mount + poll
  React.useEffect(() => {
    const rafId =
      typeof window !== 'undefined'
        ? window.requestAnimationFrame(() => {
            if ('Notification' in window) {
              setBrowserPushPermission(window.Notification.permission);
            } else {
              setBrowserPushPermission('unsupported');
            }

            try {
              // Purge legacy insecure storage keys
              for (const key of LEGACY_KEYS_TO_PURGE) {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
              }

              const storedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS);
              if (storedProducts) {
                const parsedProducts = JSON.parse(storedProducts);
                if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
                  const cleaned = parsedProducts.map((p: Producto) => ({
                    ...p,
                    variantes: Array.isArray(p.variantes)
                      ? p.variantes.map((v) => ({ ...v, diseno_motivo: '' }))
                      : [],
                  }));
                  setProducts(cleaned);
                  setIsHydrated(true);
                }
              }
              const storedCart = localStorage.getItem(STORAGE_KEY_CART);
              if (storedCart) setCart(JSON.parse(storedCart));
              const storedFavs = localStorage.getItem(STORAGE_KEY_FAVORITES);
              if (storedFavs) setFavorites(JSON.parse(storedFavs));
              const storedMyIds = localStorage.getItem(STORAGE_KEY_MY_ORDER_IDS);
              if (storedMyIds) {
                const parsedIds = JSON.parse(storedMyIds);
                if (Array.isArray(parsedIds)) {
                  setMyOrderIds(parsedIds);
                  myOrderIdsRef.current = parsedIds;
                }
              }
            } catch (e) {
              console.error(e);
            }
          })
        : 0;

    let isMounted = true;

    const handleIncomingNotifications = (
      incoming: StoreNotification[],
      isInitial: boolean
    ) => {
      setNotifications(incoming);
      if (isInitial) {
        incoming.forEach((n) => knownNotificationIdsRef.current.add(n.id));
      } else {
        for (const n of incoming) {
          if (!knownNotificationIdsRef.current.has(n.id)) {
            knownNotificationIdsRef.current.add(n.id);
            dispatchNativeAndInAppPush(n);
          }
        }
      }
    };

    const fetchBackendState = async (isInitial: boolean) => {
      try {
        const res = await fetch('/api/store', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (Array.isArray(data.products)) {
          const cleanedProducts = data.products.map((p: Producto) => ({
            ...p,
            variantes: Array.isArray(p.variantes)
              ? p.variantes.map((v) => ({ ...v, diseno_motivo: '' }))
              : [],
          }));
          setProducts(cleanedProducts);
          localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(cleanedProducts));
        }

        if (data.storeConfig) {
          setStoreConfig({
            ...PUBLIC_SAFE_DEFAULT_CONFIG,
            ...data.storeConfig,
            adminPin: '',
          });
        }

        if (data.isAdmin) {
          setIsAdminAuthenticated(true);
          if (Array.isArray(data.orders)) {
            setOrders(data.orders);
          }
          if (Array.isArray(data.plugins)) {
            setPlugins(data.plugins);
          }
          if (Array.isArray(data.stockMoves)) {
            setStockMoves(data.stockMoves);
          }
          if (Array.isArray(data.notifications)) {
            handleIncomingNotifications(data.notifications, isInitial);
          }
        } else {
          setIsAdminAuthenticated(false);
          // Public visitor: only poll status for their own placed orders (if any)
          if (myOrderIdsRef.current.length > 0) {
            const trackRes = await fetch('/api/orders/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderIds: myOrderIdsRef.current }),
            });
            if (trackRes.ok && isMounted) {
              const trackData = await trackRes.json();
              if (Array.isArray(trackData.orders)) {
                setOrders(trackData.orders);
              }
              if (Array.isArray(trackData.notifications)) {
                handleIncomingNotifications(trackData.notifications, isInitial);
              }
            }
          }
        }
      } catch {
        // Fallback to cached catalog if offline
        if (isInitial && typeof window !== 'undefined') {
          try {
            const p = localStorage.getItem(STORAGE_KEY_PRODUCTS);
            if (p) setProducts(JSON.parse(p));
          } catch (e) {
            console.error(e);
          }
        }
      } finally {
        if (isInitial && isMounted) {
          setIsHydrated(true);
        }
      }
    };

    fetchBackendState(true);

    // Visibility-aware background sync (15s only when tab is visible) to prevent server overload
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchBackendState(false);
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchBackendState(false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      if (rafId && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafId);
      }
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [dispatchNativeAndInAppPush]);

  const requestBrowserPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPushPermission('unsupported');
      return false;
    }
    try {
      const perm = await window.Notification.requestPermission();
      setBrowserPushPermission(perm);
      return perm === 'granted';
    } catch {
      return false;
    }
  };

  const dismissPushToast = () => {
    setActivePushToast(null);
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, leida: true }));
    setNotifications(updated);
    fetch('/api/store', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markNotificationsRead' }),
    }).catch(() => {});
  };

  const saveProductsLocal = (newProducts: Producto[]) => {
    setProducts(newProducts);
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(newProducts));
    } catch (e) {
      console.error(e);
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(newCart));
    } catch (e) {
      console.error(e);
    }
  };

  const registerMyOrderId = (orderId: string) => {
    const nextIds = Array.from(new Set([orderId, ...myOrderIdsRef.current])).slice(0, 25);
    myOrderIdsRef.current = nextIds;
    setMyOrderIds(nextIds);
    try {
      localStorage.setItem(STORAGE_KEY_MY_ORDER_IDS, JSON.stringify(nextIds));
    } catch (e) {
      console.error(e);
    }
  };

  const saveFavorites = (newFavs: string[]) => {
    setFavorites(newFavs);
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(newFavs));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = (productoId: string) => {
    if (favorites.includes(productoId)) {
      saveFavorites(favorites.filter((id) => id !== productoId));
    } else {
      saveFavorites([...favorites, productoId]);
    }
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.leida).length;
  }, [notifications]);

  // Cart calculations
  const cartTotalCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.cantidad, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  }, [cart]);

  // Critical stock alerts calculation
  const criticalAlerts = useMemo(() => {
    const alerts: CriticalAlertItem[] = [];
    products.forEach((prod) => {
      const minThreshold = prod.configuracion_alertas?.stock_minimo_alerta ?? 3;
      prod.variantes.forEach((variant) => {
        if (variant.stock_disponible <= minThreshold) {
          alerts.push({
            producto: prod,
            variante: variant,
            deficit: minThreshold - variant.stock_disponible,
          });
        }
      });
    });
    return alerts;
  }, [products]);

  const authenticateAdmin = async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      if (data.success && data.authenticated) {
        setIsAdminAuthenticated(true);
        if (Array.isArray(data.orders)) setOrders(data.orders);
        if (Array.isArray(data.plugins)) setPlugins(data.plugins);
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        if (data.storeConfig) {
          setStoreConfig({
            ...PUBLIC_SAFE_DEFAULT_CONFIG,
            ...data.storeConfig,
            adminPin: '',
          });
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Admin auth error:', e);
      return false;
    }
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setOrders([]);
    setNotifications([]);
    fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
  };

  const trackOrderByQuery = async (query: string): Promise<Order[]> => {
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: myOrderIdsRef.current,
          query: query.trim(),
        }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
        return data.orders;
      }
      return [];
    } catch {
      return [];
    }
  };

  // Reconcile stock helper on client for instant optimistic updates
  const reconcileClientStock = (
    currentProducts: Producto[],
    oldItems: CartItem[],
    oldDeducted: boolean,
    newItems: CartItem[],
    newDeducted: boolean,
    ubicacionDespacho?: 'Bodega Principal' | 'Punto de Venta POS',
    modalidadVenta?: ModalidadVentaPOS
  ): { success: boolean; products: Producto[]; errorMessage?: string } => {
    const nextProducts: Producto[] = structuredClone(currentProducts);

    if (oldDeducted) {
      for (const item of oldItems) {
        const prod = nextProducts.find((p) => p.id === item.productoId);
        const variant = prod?.variantes.find((v) => v.id_variante === item.varianteId);
        if (variant) {
          variant.stock_disponible += item.cantidad;
          if (modalidadVenta === 'Consignación') {
            variant.stock_consignacion = Math.max(
              0,
              (variant.stock_consignacion || 0) - item.cantidad
            );
          }
        }
      }
    }

    if (newDeducted) {
      for (const item of newItems) {
        const prod = nextProducts.find((p) => p.id === item.productoId);
        const variant = prod?.variantes.find((v) => v.id_variante === item.varianteId);
        if (!variant) {
          return {
            success: false,
            products: currentProducts,
            errorMessage: `La variante de ${item.nombre} (${item.talla}) no existe.`,
          };
        }
        const dispBodega = variant.stock_disponible || 0;
        const dispPos = variant.stock_punto_venta || 0;
        const totalSellable = dispBodega + dispPos;
        if (totalSellable < item.cantidad) {
          return {
            success: false,
            products: currentProducts,
            errorMessage: `Stock insuficiente para ${item.nombre} (Talla ${item.talla} · ${item.color}). Disponible total (Bodega + POS): ${totalSellable} un.`,
          };
        }
        if (ubicacionDespacho === 'Punto de Venta POS' && dispPos > 0) {
          const fromPos = Math.min(dispPos, item.cantidad);
          const fromBodega = item.cantidad - fromPos;
          variant.stock_punto_venta = Math.max(0, dispPos - fromPos);
          variant.stock_disponible = Math.max(0, dispBodega - fromBodega);
        } else {
          const fromBodega = Math.min(dispBodega, item.cantidad);
          const fromPos = item.cantidad - fromBodega;
          variant.stock_disponible = Math.max(0, dispBodega - fromBodega);
          variant.stock_punto_venta = Math.max(0, dispPos - fromPos);
        }
        if (modalidadVenta === 'Consignación') {
          variant.stock_consignacion = (variant.stock_consignacion || 0) + item.cantidad;
        }
      }
    }

    return { success: true, products: nextProducts };
  };

  // POS Inventory CRUD: Create Product
  const createProduct = async (
    productData: Omit<Producto, 'id'>
  ): Promise<{ success: boolean; product?: Producto; message?: string }> => {
    const previousProducts = structuredClone(products);
    const newProd: Producto = {
      ...productData,
      id: `prod-${Date.now()}`,
    };
    const nextList = [newProd, ...products];
    saveProductsLocal(nextList);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        saveProductsLocal(previousProducts);
        return {
          success: false,
          message: data.message || 'No se pudo guardar el producto en el servidor.',
        };
      }
      if (Array.isArray(data.products)) {
        saveProductsLocal(data.products);
      }
      return { success: true, product: data.product || newProd };
    } catch (e) {
      console.error(e);
      saveProductsLocal(previousProducts);
      return {
        success: false,
        message: 'Error de red al guardar el producto.',
      };
    }
  };

  // POS Inventory CRUD: Update Product
  const updateProduct = async (
    updatedProduct: Producto
  ): Promise<{ success: boolean; message?: string }> => {
    const previousProducts = structuredClone(products);
    const nextList = products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
    saveProductsLocal(nextList);

    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: updatedProduct }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        saveProductsLocal(previousProducts);
        return {
          success: false,
          message: data.message || 'No se pudo actualizar el producto en el servidor.',
        };
      }
      if (Array.isArray(data.products)) {
        saveProductsLocal(data.products);
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      saveProductsLocal(previousProducts);
      return {
        success: false,
        message: 'Error de red al actualizar el producto.',
      };
    }
  };

  // POS Inventory CRUD: Delete Product
  const deleteProduct = async (
    productoId: string
  ): Promise<{ success: boolean; message?: string }> => {
    const nextList = products.filter((p) => p.id !== productoId);
    saveProductsLocal(nextList);

    try {
      await fetch(`/api/products?id=${encodeURIComponent(productoId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error(e);
    }

    return { success: true };
  };

  const updateVariantStock = (productoId: string, varianteId: string, newStock: number) => {
    const previousProducts = structuredClone(products);
    const validated = Math.max(0, newStock);
    const updated = products.map((prod) => {
      if (prod.id !== productoId) return prod;
      return {
        ...prod,
        variantes: prod.variantes.map((v) =>
          v.id_variante === varianteId ? { ...v, stock_disponible: validated } : v
        ),
      };
    });
    saveProductsLocal(updated);

    fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateStock',
        productoId,
        varianteId,
        newStock: validated,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          saveProductsLocal(data.products);
          if (Array.isArray(data.stockMoves)) {
            setStockMoves(data.stockMoves);
          }
        }
      })
      .catch((err) => {
        console.error('Error sincronizando stock con servidor, revirtiendo estado local:', err);
        saveProductsLocal(previousProducts);
      });
  };

  const transferWarehouseStock = async (payload: {
    productoId: string;
    varianteId: string;
    tipo: 'BODEGA_A_POS' | 'POS_A_BODEGA' | 'SALIDA_CONSIGNACION' | 'RETORNO_CONSIGNACION';
    cantidad: number;
    destinoNombre?: string;
    precioUnitarioPactado?: number;
    notas?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const qty = Math.max(1, Math.floor(Number(payload.cantidad) || 0));
    if (!qty) {
      return { success: false, message: 'La cantidad debe ser al menos 1 unidad.' };
    }

    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transferWarehouse',
          ...payload,
          cantidad: qty,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'No se pudo procesar el traslado de bodega.',
        };
      }
      if (Array.isArray(data.products)) {
        saveProductsLocal(data.products);
      }
      if (Array.isArray(data.stockMoves)) {
        setStockMoves(data.stockMoves);
      }
      return { success: true };
    } catch (err) {
      console.error('Error ejecutando traslado de bodega:', err);
      return {
        success: false,
        message: 'Error de red al registrar el traslado de bodega.',
      };
    }
  };

  const updateProductAlertThreshold = (productoId: string, newThreshold: number) => {
    const previousProducts = structuredClone(products);
    const validated = Math.max(0, newThreshold);
    const updated = products.map((prod) => {
      if (prod.id !== productoId) return prod;
      return {
        ...prod,
        configuracion_alertas: {
          stock_minimo_alerta: validated,
        },
      };
    });
    saveProductsLocal(updated);

    fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateThreshold',
        productoId,
        newThreshold: validated,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          saveProductsLocal(data.products);
        }
      })
      .catch((err) => {
        console.error('Error actualizando umbral de alerta, revirtiendo:', err);
        saveProductsLocal(previousProducts);
      });
  };

  const resetToInitialCatalog = () => {
    fetch('/api/store', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.success && data.db) {
          saveProductsLocal(data.db.products);
          setOrders(data.db.orders);
          setStoreConfig({
            ...PUBLIC_SAFE_DEFAULT_CONFIG,
            ...data.db.storeConfig,
            adminPin: '',
          });
          setNotifications(data.db.notifications);
          setPlugins(data.db.plugins);
        }
      })
      .catch((err) => {
        console.error('Error restableciendo catálogo:', err);
      });
  };

  const addToCart = (
    newItem: Omit<CartItem, 'cartItemId'>
  ): { success: boolean; message?: string } => {
    const prod = products.find((p) => p.id === newItem.productoId);
    const variant = prod?.variantes.find((v) => v.id_variante === newItem.varianteId);

    if (!variant || variant.stock_disponible <= 0) {
      return { success: false, message: 'La variante seleccionada está agotada.' };
    }

    const existingIndex = cart.findIndex(
      (c) => c.productoId === newItem.productoId && c.varianteId === newItem.varianteId
    );

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      const proposedQty = existing.cantidad + newItem.cantidad;

      if (proposedQty > variant.stock_disponible) {
        return {
          success: false,
          message: `Stock máximo disponible alcanzado (${variant.stock_disponible} unidades).`,
        };
      }

      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...existing,
        cantidad: proposedQty,
        stockMaximo: variant.stock_disponible,
      };
      saveCart(updatedCart);
      return { success: true };
    } else {
      if (newItem.cantidad > variant.stock_disponible) {
        return {
          success: false,
          message: `Solo hay ${variant.stock_disponible} unidades disponibles.`,
        };
      }

      const cartItem: CartItem = {
        ...newItem,
        cartItemId: `${newItem.productoId}_${newItem.varianteId}_${Date.now()}`,
        stockMaximo: variant.stock_disponible,
      };
      saveCart([...cart, cartItem]);
      return { success: true };
    }
  };

  const updateCartQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    const item = cart.find((c) => c.cartItemId === cartItemId);
    if (!item) return;

    const prod = products.find((p) => p.id === item.productoId);
    const variant = prod?.variantes.find((v) => v.id_variante === item.varianteId);
    const currentMax = variant ? variant.stock_disponible : item.stockMaximo;

    const validatedQty = Math.min(newQty, currentMax);

    const updated = cart.map((c) =>
      c.cartItemId === cartItemId ? { ...c, cantidad: validatedQty, stockMaximo: currentMax } : c
    );
    saveCart(updated);
  };

  const removeFromCart = (cartItemId: string) => {
    saveCart(cart.filter((c) => c.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    saveCart([]);
  };

  const buildClientNotification = (
    order: Order,
    nuevoEstado: 'Despachado' | 'Entregado'
  ): StoreNotification => {
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
  };

  const triggerManualPushTest = (order: Order, estado: 'Despachado' | 'Entregado') => {
    const notif = buildClientNotification(order, estado);
    knownNotificationIdsRef.current.add(notif.id);
    setNotifications([notif, ...notifications]);
    dispatchNativeAndInAppPush(notif);
  };

  // 1. Create order from WhatsApp checkout with verified server registration
  const createOrder = async (payload: {
    clienteNombre: string;
    clienteDireccion: string;
    clienteTelefono: string;
    envioOpcion: 'recoger' | 'nacional' | 'cartagena' | 'local';
    notas?: string;
  }): Promise<{ success: boolean; order?: Order; message?: string }> => {
    if (cart.length === 0) {
      return { success: false, message: 'La bolsa de compra está vacía.' };
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: 'WhatsApp',
          clienteNombre: payload.clienteNombre,
          clienteDireccion: payload.clienteDireccion,
          clienteTelefono: payload.clienteTelefono,
          envioOpcion: payload.envioOpcion,
          items: cart,
          notas: payload.notas,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.order) {
        return {
          success: false,
          message: data.message || 'No fue posible registrar el pedido. Intenta nuevamente.',
        };
      }

      const confirmedOrder: Order = data.order;
      registerMyOrderId(confirmedOrder.id);
      setOrders((prev) => [confirmedOrder, ...prev.filter((o) => o.id !== confirmedOrder.id)]);
      clearCart();
      return { success: true, order: confirmedOrder };
    } catch (err) {
      console.error('Error al registrar pedido WhatsApp:', err);
      return {
        success: false,
        message: 'Error de conexión al registrar tu pedido. Por favor verifica tu conexión a internet.',
      };
    }
  };

  // 2. Create a direct POS internal invoice
  const createPosInvoice = (payload: {
    clienteNombre: string;
    clienteDocumento?: string;
    clienteTelefono?: string;
    clienteDireccion?: string;
    transportadora?: string;
    guiaSeguimiento?: string;
    items: CartItem[];
    costoEnvio: number;
    descuentoManual?: number;
    metodoPagoInterno: MetodoPagoInterno;
    modalidadVenta?: ModalidadVentaPOS;
    ubicacionDespacho?: 'Bodega Principal' | 'Punto de Venta POS';
    montoAbonado?: number;
    fechaVencimiento?: string;
    estado?: EstadoPedido;
    notas?: string;
  }): { success: boolean; order?: Order; message?: string } => {
    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: 'Agrega al menos un producto a la factura POS.' };
    }

    const estadoInicial: EstadoPedido = payload.estado || 'Facturado';
    const shouldDeduct = isStockCommitted(estadoInicial);
    const modalidadVenta: ModalidadVentaPOS = payload.modalidadVenta || 'Detal';
    const ubicacionDespacho = payload.ubicacionDespacho || 'Bodega Principal';

    const stockRes = reconcileClientStock(
      products,
      [],
      false,
      payload.items,
      shouldDeduct,
      ubicacionDespacho,
      modalidadVenta
    );
    if (!stockRes.success) {
      return { success: false, message: stockRes.errorMessage };
    }

    const nextSeq = storeConfig.nextInvoiceSequence || 1003;
    const invoiceNum = `FAC-${nextSeq}`;
    const orderNum = `#POS-${nextSeq}`;
    const formattedDate = getFormattedNow();
    const subtotal = payload.items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
    const envio = Math.max(0, Number(payload.costoEnvio) || 0);
    const descuento = Math.max(0, Number(payload.descuentoManual) || 0);
    const total = Math.max(0, subtotal + envio - descuento);

    const isCreditOrConsig =
      modalidadVenta === 'Crédito' || modalidadVenta === 'Consignación';
    const montoAbonado =
      payload.montoAbonado !== undefined
        ? Math.min(total, Math.max(0, Number(payload.montoAbonado) || 0))
        : isCreditOrConsig
        ? 0
        : total;
    const saldoPendiente = Math.max(0, total - montoAbonado);

    const newInvoiceOrder: Order = {
      id: `pos-${Date.now()}`,
      orderNumber: orderNum,
      invoiceNumber: invoiceNum,
      fecha: formattedDate,
      fechaFacturacion: formattedDate,
      fechaDespacho:
        estadoInicial === 'Despachado' || estadoInicial === 'Entregado'
          ? formattedDate
          : undefined,
      fechaEntrega: estadoInicial === 'Entregado' ? formattedDate : undefined,
      origen: 'POS Interno',
      modalidadVenta,
      ubicacionDespacho,
      clienteNombre: payload.clienteNombre.trim() || 'Cliente Mostrador Cartagena',
      clienteDocumento: payload.clienteDocumento?.trim() || '222222222222',
      clienteTelefono: payload.clienteTelefono?.trim() || '',
      clienteDireccion:
        payload.clienteDireccion?.trim() || 'Punto de Venta Cartagena de Indias',
      transportadora: payload.transportadora?.trim() || '',
      guiaSeguimiento: payload.guiaSeguimiento?.trim() || '',
      items: payload.items,
      subtotal,
      costoEnvio: envio,
      descuentoManual: descuento,
      envioTexto: envio > 0 ? formatCOP(envio) : 'Sin costo / Local Cartagena',
      total,
      montoAbonado,
      saldoPendiente,
      fechaVencimiento: payload.fechaVencimiento?.trim() || undefined,
      estado: estadoInicial,
      metodoPagoInterno: payload.metodoPagoInterno,
      stockDeducted: shouldDeduct,
      notas: payload.notas,
      referenceUrl: `https://store.app/factura/${invoiceNum}`,
    };

    saveProductsLocal(stockRes.products);
    setOrders([newInvoiceOrder, ...orders]);
    setStoreConfig({ ...storeConfig, nextInvoiceSequence: nextSeq + 1 });

    if (estadoInicial === 'Despachado' || estadoInicial === 'Entregado') {
      const notif = buildClientNotification(newInvoiceOrder, estadoInicial);
      knownNotificationIdsRef.current.add(notif.id);
      setNotifications([notif, ...notifications]);
      dispatchNativeAndInAppPush(notif);
    }

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newInvoiceOrder.id,
        origen: 'POS Interno',
        ...payload,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
          if (Array.isArray(data.products)) saveProductsLocal(data.products);
          if (Array.isArray(data.stockMoves)) setStockMoves(data.stockMoves);
          if (data.storeConfig) {
            setStoreConfig({
              ...PUBLIC_SAFE_DEFAULT_CONFIG,
              ...data.storeConfig,
              adminPin: '',
            });
          }
        }
      })
      .catch(() => {});

    return { success: true, order: newInvoiceOrder };
  };

  // 3. Emit official invoice from an existing pending order
  const emitirFacturaOrder = (
    orderId: string,
    billingPayload: {
      clienteNombre: string;
      clienteDocumento?: string;
      clienteTelefono?: string;
      clienteDireccion: string;
      transportadora?: string;
      guiaSeguimiento?: string;
      costoEnvio: number;
      descuentoManual?: number;
      metodoPagoInterno: MetodoPagoInterno;
      notas?: string;
    }
  ): { success: boolean; order?: Order; message?: string } => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) {
      return { success: false, message: 'Pedido no encontrado.' };
    }

    return updateOrderFull(orderId, {
      clienteNombre: billingPayload.clienteNombre,
      clienteDocumento: billingPayload.clienteDocumento,
      clienteTelefono: billingPayload.clienteTelefono,
      clienteDireccion: billingPayload.clienteDireccion,
      transportadora: billingPayload.transportadora,
      guiaSeguimiento: billingPayload.guiaSeguimiento,
      items: targetOrder.items,
      costoEnvio: billingPayload.costoEnvio,
      descuentoManual: billingPayload.descuentoManual,
      metodoPagoInterno: billingPayload.metodoPagoInterno,
      estado: 'Facturado',
      notas: billingPayload.notas,
    });
  };

  // 4. Full Modify / Edit of any existing Order or Invoice (reconciles stock automatically)
  const updateOrderFull = (
    orderId: string,
    payload: {
      clienteNombre: string;
      clienteDocumento?: string;
      clienteTelefono?: string;
      clienteDireccion: string;
      transportadora?: string;
      guiaSeguimiento?: string;
      items: CartItem[];
      costoEnvio: number;
      descuentoManual?: number;
      metodoPagoInterno: MetodoPagoInterno;
      modalidadVenta?: ModalidadVentaPOS;
      ubicacionDespacho?: 'Bodega Principal' | 'Punto de Venta POS';
      montoAbonado?: number;
      fechaVencimiento?: string;
      estado: EstadoPedido;
      notas?: string;
    }
  ): { success: boolean; order?: Order; message?: string } => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) {
      return { success: false, message: 'Factura o pedido no encontrado.' };
    }
    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: 'La factura debe tener al menos un producto.' };
    }

    const shouldDeductNext = isStockCommitted(payload.estado);
    const nextModalidad: ModalidadVentaPOS =
      payload.modalidadVenta || targetOrder.modalidadVenta || 'Detal';
    const nextUbicacion =
      payload.ubicacionDespacho || targetOrder.ubicacionDespacho || 'Bodega Principal';

    const stockRes = reconcileClientStock(
      products,
      targetOrder.items,
      targetOrder.stockDeducted,
      payload.items,
      shouldDeductNext,
      nextUbicacion,
      nextModalidad
    );

    if (!stockRes.success) {
      return { success: false, message: stockRes.errorMessage };
    }

    const formattedDate = getFormattedNow();
    const nextSeq = storeConfig.nextInvoiceSequence || 1003;
    let assignedInvoice = targetOrder.invoiceNumber;
    let fechaFacturacion = targetOrder.fechaFacturacion;
    let seqIncremented = false;

    if (shouldDeductNext && !assignedInvoice) {
      assignedInvoice = `FAC-${nextSeq}`;
      fechaFacturacion = formattedDate;
      seqIncremented = true;
    }

    const subtotal = payload.items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
    const envio = Math.max(0, Number(payload.costoEnvio) || 0);
    const descuento = Math.max(0, Number(payload.descuentoManual) || 0);
    const total = Math.max(0, subtotal + envio - descuento);

    const isCreditOrConsig =
      nextModalidad === 'Crédito' || nextModalidad === 'Consignación';
    const nextMontoAbonado =
      payload.montoAbonado !== undefined
        ? Math.min(total, Math.max(0, Number(payload.montoAbonado) || 0))
        : targetOrder.montoAbonado !== undefined
        ? Math.min(total, targetOrder.montoAbonado)
        : isCreditOrConsig
        ? 0
        : total;
    const nextSaldoPendiente = Math.max(0, total - nextMontoAbonado);

    const updatedOrder: Order = {
      ...targetOrder,
      invoiceNumber: assignedInvoice,
      fechaFacturacion,
      fechaDespacho:
        payload.estado === 'Despachado' && !targetOrder.fechaDespacho
          ? formattedDate
          : targetOrder.fechaDespacho,
      fechaEntrega:
        payload.estado === 'Entregado' && !targetOrder.fechaEntrega
          ? formattedDate
          : targetOrder.fechaEntrega,
      modalidadVenta: nextModalidad,
      ubicacionDespacho: nextUbicacion,
      clienteNombre: payload.clienteNombre.trim() || targetOrder.clienteNombre,
      clienteDocumento: payload.clienteDocumento?.trim() ?? targetOrder.clienteDocumento,
      clienteTelefono: payload.clienteTelefono?.trim() ?? targetOrder.clienteTelefono,
      clienteDireccion: payload.clienteDireccion.trim() || targetOrder.clienteDireccion,
      transportadora: payload.transportadora?.trim() ?? targetOrder.transportadora,
      guiaSeguimiento: payload.guiaSeguimiento?.trim() ?? targetOrder.guiaSeguimiento,
      items: payload.items,
      subtotal,
      costoEnvio: envio,
      descuentoManual: descuento,
      envioTexto: envio > 0 ? formatCOP(envio) : 'Gratis / Local Cartagena',
      total,
      montoAbonado: nextMontoAbonado,
      saldoPendiente: nextSaldoPendiente,
      fechaVencimiento:
        payload.fechaVencimiento !== undefined
          ? payload.fechaVencimiento.trim() || undefined
          : targetOrder.fechaVencimiento,
      estado: payload.estado,
      metodoPagoInterno: payload.metodoPagoInterno,
      stockDeducted: shouldDeductNext,
      notas: payload.notas ?? targetOrder.notas,
    };

    saveProductsLocal(stockRes.products);
    setOrders(orders.map((o) => (o.id === orderId ? updatedOrder : o)));
    if (seqIncremented) {
      setStoreConfig({ ...storeConfig, nextInvoiceSequence: nextSeq + 1 });
    }

    // Trigger Push Notification if status changed to 'Despachado' or 'Entregado'
    if (
      (payload.estado === 'Despachado' || payload.estado === 'Entregado') &&
      targetOrder.estado !== payload.estado
    ) {
      const notif = buildClientNotification(updatedOrder, payload.estado);
      knownNotificationIdsRef.current.add(notif.id);
      setNotifications([notif, ...notifications]);
      dispatchNativeAndInAppPush(notif);
    }

    fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...payload }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
          if (Array.isArray(data.products)) saveProductsLocal(data.products);
          if (Array.isArray(data.stockMoves)) setStockMoves(data.stockMoves);
          if (Array.isArray(data.notifications)) {
            data.notifications.forEach((n: StoreNotification) =>
              knownNotificationIdsRef.current.add(n.id)
            );
            setNotifications(data.notifications);
          }
        }
      })
      .catch(() => {});

    return { success: true, order: updatedOrder };
  };

  const registerOrderPayment = (
    orderId: string,
    abonoAdicional: number,
    metodoPago?: MetodoPagoInterno
  ): { success: boolean; order?: Order; message?: string } => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) {
      return { success: false, message: 'Factura no encontrada.' };
    }
    const cleanAbono = Math.max(0, Number(abonoAdicional) || 0);
    if (cleanAbono <= 0) {
      return { success: false, message: 'Ingresa un monto de abono mayor a $0.' };
    }
    const currentAbonado = targetOrder.montoAbonado ?? 0;
    const nextAbonado = Math.min(targetOrder.total, currentAbonado + cleanAbono);
    const formattedDate = getFormattedNow();
    const paymentNote = `[Abono +${formatCOP(cleanAbono)} el ${formattedDate}${
      metodoPago ? ` vía ${metodoPago}` : ''
    }]`;
    const nextNotas = targetOrder.notas
      ? `${targetOrder.notas} · ${paymentNote}`
      : paymentNote;

    return updateOrderFull(orderId, {
      clienteNombre: targetOrder.clienteNombre,
      clienteDocumento: targetOrder.clienteDocumento,
      clienteTelefono: targetOrder.clienteTelefono,
      clienteDireccion: targetOrder.clienteDireccion,
      transportadora: targetOrder.transportadora,
      guiaSeguimiento: targetOrder.guiaSeguimiento,
      items: targetOrder.items,
      costoEnvio: targetOrder.costoEnvio,
      descuentoManual: targetOrder.descuentoManual,
      metodoPagoInterno: metodoPago || targetOrder.metodoPagoInterno,
      modalidadVenta: targetOrder.modalidadVenta,
      ubicacionDespacho: targetOrder.ubicacionDespacho,
      montoAbonado: nextAbonado,
      fechaVencimiento: targetOrder.fechaVencimiento,
      estado: targetOrder.estado,
      notas: nextNotas,
    });
  };

  // 5. Annul / Issue Credit Note for Billed Invoice OR Delete Draft Order, restoring stock
  const deleteOrder = (orderId: string): { success: boolean; message?: string } => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      return { success: false, message: 'Factura no encontrada.' };
    }

    const previousOrders = structuredClone(orders);
    const previousProducts = structuredClone(products);

    if (target.stockDeducted) {
      const stockRes = reconcileClientStock(products, target.items, true, [], false);
      saveProductsLocal(stockRes.products);
    }

    if (target.invoiceNumber) {
      const nextNcSeq = storeConfig.nextCreditNoteSequence || 1001;
      const creditNoteNumber = target.creditNoteNumber || `NC-${nextNcSeq}`;
      setOrders(
        orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                estado: 'Cancelado',
                stockDeducted: false,
                creditNoteNumber,
                fechaNotaCredito: getFormattedNow(),
                motivoNotaCredito: 'Anulación contable mediante Nota Crédito con retorno a inventario',
              }
            : o
        )
      );
    } else {
      setOrders(orders.filter((o) => o.id !== orderId));
      setNotifications(notifications.filter((n) => n.orderId !== orderId));
    }

    fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.orders)) setOrders(data.orders);
          if (Array.isArray(data.products)) saveProductsLocal(data.products);
          if (Array.isArray(data.stockMoves)) setStockMoves(data.stockMoves);
          if (data.storeConfig) {
            setStoreConfig({
              ...PUBLIC_SAFE_DEFAULT_CONFIG,
              ...data.storeConfig,
              adminPin: '',
            });
          }
        }
      })
      .catch((err) => {
        console.error('Error anulando/eliminando orden, revirtiendo estado local:', err);
        setOrders(previousOrders);
        saveProductsLocal(previousProducts);
      });

    return { success: true };
  };

  // 6. Quick Status Update (Triggers Push Notification when changing to 'Despachado' or 'Entregado')
  const updateOrderStatus = (
    orderId: string,
    nuevoEstado: EstadoPedido,
    trackingInfo?: { transportadora?: string; guiaSeguimiento?: string }
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    updateOrderFull(orderId, {
      clienteNombre: target.clienteNombre,
      clienteDocumento: target.clienteDocumento,
      clienteTelefono: target.clienteTelefono,
      clienteDireccion: target.clienteDireccion,
      transportadora: trackingInfo?.transportadora ?? target.transportadora,
      guiaSeguimiento: trackingInfo?.guiaSeguimiento ?? target.guiaSeguimiento,
      items: target.items,
      costoEnvio: target.costoEnvio,
      descuentoManual: target.descuentoManual,
      metodoPagoInterno: target.metodoPagoInterno,
      estado: nuevoEstado,
      notas: target.notas,
    });
  };

  const updatePluginConnector = async (
    pluginId: string,
    updates: Partial<PluginConnector>
  ) => {
    const nextPlugins = plugins.map((p) =>
      p.id === pluginId
        ? { ...p, ...updates, ultimaSincronizacion: `Actualizado ${getFormattedNow()}` }
        : p
    );
    setPlugins(nextPlugins);

    try {
      const res = await fetch('/api/plugins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, ...updates }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.plugins)) {
        setPlugins(data.plugins);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateStoreConfig = async (
    configUpdate: Partial<StoreConfig>,
    currentPin?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const previousCfg = structuredClone(storeConfig);
    const nextCfg: StoreConfig = {
      ...storeConfig,
      ...configUpdate,
      adminPin: '',
    };
    setStoreConfig(nextCfg);

    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin,
          storeConfig: {
            ...storeConfig,
            ...configUpdate,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStoreConfig(previousCfg);
        return {
          success: false,
          message:
            data.message || 'No se pudo actualizar la configuración corporativa.',
        };
      }
      if (data.storeConfig) {
        setStoreConfig({
          ...PUBLIC_SAFE_DEFAULT_CONFIG,
          ...data.storeConfig,
          adminPin: '',
        });
      }
      return { success: true };
    } catch (err) {
      console.error('Error guardando configuración corporativa, revirtiendo:', err);
      setStoreConfig(previousCfg);
      return {
        success: false,
        message: 'Error de red al guardar la configuración.',
      };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        cart,
        orders,
        favorites,
        storeConfig,
        plugins,
        notifications,
        stockMoves,
        unreadNotificationsCount,
        activePushToast,
        dismissPushToast,
        markAllNotificationsRead,
        browserPushPermission,
        requestBrowserPushPermission,
        triggerManualPushTest,
        trackOrderByQuery,
        cartTotalCount,
        cartSubtotal,
        criticalAlerts,
        isHydrated,
        isAdminAuthenticated,
        authenticateAdmin,
        logoutAdmin,
        toggleFavorite,
        createProduct,
        updateProduct,
        deleteProduct,
        updateVariantStock,
        transferWarehouseStock,
        updateProductAlertThreshold,
        resetToInitialCatalog,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        createOrder,
        createPosInvoice,
        emitirFacturaOrder,
        updateOrderFull,
        registerOrderPayment,
        deleteOrder,
        updateOrderStatus,
        updatePluginConnector,
        updateStoreConfig,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
