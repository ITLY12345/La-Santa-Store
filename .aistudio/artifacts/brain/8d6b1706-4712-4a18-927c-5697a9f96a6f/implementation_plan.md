# Evolución Empresarial: Sistema POS Profesional, Inventario con Fotos, Notificaciones Push y Backend Modular

Transformación de la tienda en una plataforma de comercio electrónico y punto de venta (POS) de nivel empresarial con sede en **Cartagena de Indias, Colombia**, equipada con notificaciones push en tiempo real, terminal de facturación POS con ciclo CRUD completo, gestión visual de inventario con subida de fotografías y un backend API REST preparado para conectar pasarelas de pago y plugins externos.

## User Review & Critical Decisions

> [!IMPORTANT]
> Se han integrado todas las respuestas confirmadas en la fase de clarificación junto con los 6 requerimientos solicitados:

- **Decisión Confirmada 1 (Notificaciones Push y Seguimiento de Pedidos)**: Cuando un pedido cambia en el panel administrativo a estado **`Despachado`** o **`Entregado`**, se dispara una **notificación push nativa del navegador** (`Notification API` / `Service Worker`) acompañada de una **campana de notificaciones y panel de seguimiento en vivo dentro de la tienda** para que el cliente consulte el estado e historial de sus pedidos en tiempo real.
- **Decisión Confirmada 2 (Inventario POS Profesional con Fotos)**: El módulo de inventario permite **crear nuevos productos, editar productos existentes y eliminarlos**, incluyendo **subida directa de fotografías desde el dispositivo o por URL**, visualización en miniatura de alta resolución y administración completa de variantes (talla, color, edición, código SKU y existencias).
- **Decisión Confirmada 3 (Backend API REST con Persistencia en Servidor y Arquitectura de Plugins)**: La tienda contará con un **backend real mediante rutas API REST en Next.js** con persistencia en servidor (archivo de base de datos estructurado en el servidor sincronizado en tiempo real) y un **Motor de Plugins y Pasarelas de Pago** listo para activar integraciones (Wompi, Bold, Mercado Pago, PayU, Coordinadora/Envía y Webhooks).
- **Sede Oficial y Leyenda Corporativa**: Toda la operación, facturación, políticas y envíos tienen como base **Cartagena de Indias, Colombia**, y el pie de página reemplaza el texto anterior por una leyenda corporativa ejecutiva.

---

## 1. Overview & Core Concept

- **Qué Hace**: Unifica un catálogo comercial minimalista con un sistema administrativo POS completo, conectado a un backend transaccional capaz de emitir, editar y anular/eliminar facturas, gestionar inventario fotográfico, notificar al comprador cuando su orden es despachada o entregada, y administrar conectores de pasarelas de pago y logística.
- **Público Objetivo**: Clientes compradores en toda Colombia (con despachos desde Cartagena) y operadores de caja/administración que requieren control riguroso de facturación e inventario.
- **Valor Principal**: Elimina las limitaciones de un prototipo estático al ofrecer persistencia real en servidor, ciclo completo de vida de facturas y productos con fotos, alertas push al cliente y arquitectura extensible para futuros plugins.

---

## 2. User Experience & Visual Design

- **Flujos Clave de Usuario**:
  1. **Notificaciones Push y Seguimiento de Pedidos del Cliente (`Despachado` / `Entregado`)**:
     - En la barra superior (`Topbar`) junto a Favoritos y Carrito, el cliente cuenta con un botón de **Seguimiento y Notificaciones** con indicador de alertas no leídas.
     - Al realizar un pedido por WhatsApp o buscar su número de orden/teléfono, el cliente puede activar las **Notificaciones Push del Navegador**.
     - Cuando el administrador cambia el estado de un pedido a **`Despachado`** o **`Entregado`**, el backend registra el evento de notificación y el cliente recibe inmediatamente:
       - Una **Notificación Nativa del Sistema Operativo / Navegador** (`"¡Tu pedido #ORD-1002 ha sido Despachado desde Cartagena!"`).
       - Una alerta visual interactiva y el estado actualizado en la línea de tiempo de su pedido (`Pendiente` → `Facturado` → `Despachado` → `Entregado`).
  2. **Terminal de Facturación POS Profesional (Crear, Modificar, Eliminar y Anular)**:
     - **Terminal Visual de Caja POS**: Selector visual de productos con fotografía, buscador rápido por nombre o categoría, selección de variante con stock en vivo, carrito de facturación POS con ajuste de cantidades (`+`/`-`) y precios, datos completos del cliente (Nombre, Cédula/NIT, Teléfono, Dirección en Cartagena o nacional), costo de envío, descuento y medio de pago.
     - **Edición Completa de Facturas y Pedidos (`Modificar`)**: Cualquier factura o pedido existente puede abrirse en el **Editor de Factura POS** para modificar datos del cliente, agregar o quitar prendas, ajustar cantidades, cambiar el método de pago, modificar envío/descuento o actualizar observaciones, recalculando automáticamente las diferencias de inventario.
     - **Eliminación y Anulación (`Eliminar`)**: Opción para **Anular** (restaurando el stock al inventario con trazabilidad) o **Eliminar definitivamente** un registro de factura/pedido con confirmación de seguridad.
  3. **Sistema de Inventario POS Profesional con Fotografías**:
     - **Catálogo Administrativo con Fotos**: Cada producto se presenta con su fotografía de estudio, código de referencia, categoría (`Camisetas`, `Bolsos`, `Chanclas`), marca/línea, precio base, umbral de alerta y tabla matricial de variantes.
     - **Crear y Editar Producto con Subida de Fotos**: Modal profesional donde el administrador puede subir una fotografía desde su equipo (conversión optimizada) o ingresar URL de imagen con vista previa instantánea, editar nombre, descripción, categoría, precio y gestionar dinámicamente todas sus variantes (agregar nuevas tallas/colores, editar stock o eliminar variantes).
     - **Eliminar Producto**: Botón con confirmación para retirar referencias descontinuadas del catálogo.
  4. **Módulo de Plugins, Pasarelas de Pago y Webhooks (Arquitectura Backend)**:
     - Nueva pestaña en la consola administrativa (**`Plugins & API`**) conectada al backend de la tienda donde se visualizan y configuran los conectores modulares preparados para el crecimiento de la plataforma:
       - **Pasarelas de Pago**: Conectores estructurados para **Wompi Bancolombia**, **Bold**, **Mercado Pago** y **PayU Latam** (modo prueba/producción, llaves públicas/webhooks y estado de activación).
       - **Logística y Despachos desde Cartagena**: Conectores para transportadoras nacionales (**Coordinadora**, **Envía**, **Inter Rapidísimo**) y tarifa base local en Cartagena.
       - **Estado del Servidor API REST**: Panel de salud y sincronización con los endpoints del backend.
  5. **Sede Cartagena, Colombia y Leyenda Corporativa**:
     - Ubicación predeterminada actualizada en toda la tienda, facturas y políticas a **`Cartagena de Indias, Colombia · Despachos Nacionales`**.
     - Nueva leyenda corporativa en el pie de página:
       > *"Firma colombiana de moda urbana y marroquinería contemporánea con centro de operaciones en Cartagena de Indias. Distribución nacional garantizada, control de existencias en tiempo real y atención personalizada."*
- **Identidad Visual y Tema**:
  - Conserva la estética minimalista 1:1 en blanco puro (`#FFFFFF`), gris piedra suave (`#F5F5F7`) y negro mate (`#111111`), aplicando tablas de alta densidad con numerales tabulares (`tabular-nums`) y jerarquía clara en el panel POS.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Backend Real con API REST en Next.js y Persistencia en Servidor**
  - *Enfoque Elegido*: Implementar controladores de servidor en Next.js (`/api/store`, `/api/orders`, `/api/products`, `/api/notifications`, `/api/plugins`) respaldados por una capa de persistencia transaccional en el servidor y caché reactivo en el cliente.
  - *Por Qué*: Garantiza que la tienda funcione con una arquitectura cliente-servidor real, permitiendo que futuras pasarelas de pago reciban confirmaciones vía Webhook en el servidor y que los cambios de estado (`Despachado` / `Entregado`) se sincronicen entre el administrador y el cliente.
- **Decisión 2: Reconciliación Automática de Inventario al Editar o Eliminar Facturas**
  - *Enfoque Elegido*: Cuando el administrador edita las unidades o prendas de una factura ya emitida o la elimina, el motor de inventario calcula automáticamente la diferencia neta de unidades por variante (`stock_disponible`) y actualiza las existencias sin inconsistencias.
  - *Por Qué*: Es el estándar indispensable de un sistema POS profesional para evitar descuadres de bodega.
- **Decisión 3: Sistema Dual de Notificaciones Push (`Notification API` + Bandeja en Vivo)**
  - *Enfoque Elegido*: Combinar la API nativa `window.Notification` / `ServiceWorkerRegistration.showNotification` con un motor de eventos sincronizado con el servidor y una bandeja de notificaciones y rastreo de pedidos en el encabezado de la tienda.
  - *Por Qué*: Asegura que el comprador reciba tanto la alerta nativa en su teléfono/computador como un registro visual permanente cuando su pedido pase a **`Despachado`** o **`Entregado`**.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Diagrama de Arquitectura Cliente-Servidor y Motor de Plugins**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE EXPERIENCIA DEL CLIENTE                       │
│  • Catálogo Minimalista · Carrito · Rastreador de Pedidos en Vivo            │
│  • Motor de Notificaciones Push (Web Notification API + Bandeja de Alertas)  │
└──────────────────────┬────────────────────────────────────┬──────────────────┘
                       │ Peticiones HTTP / Polling          │ Eventos Push
                       ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 BACKEND TRANSACCIONAL NEXT.JS (API REST)                     │
│                                                                              │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │ /api/products       │  │ /api/orders          │  │ /api/plugins        │  │
│  │ CRUD Productos,     │  │ Crear, Editar,       │  │ Registro Modular de │  │
│  │ Subida de Fotos y   │  │ Eliminar Facturas,   │  │ Pasarelas (Wompi,   │  │
│  │ Matriz de Variantes │  │ Estados: Pendiente,  │  │ Bold, MercadoPago), │  │
│  └──────────┬──────────┘  │ Facturado,           │  │ Logística Cartagena │  │
│             │             │ Despachado,          │  │ y Webhooks          │  │
│             │             │ Entregado, Cancelado │  └──────────┬──────────┘  │
│             │             └──────────┬───────────┘             │             │
│             ▼                        ▼                         ▼             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │       MOTOR DE PERSISTENCIA EN SERVIDOR Y RECONCILIACIÓN DE STOCK      │  │
│  │   Almacenamiento JSON Transaccional + Cola de Notificaciones al Cliente│  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────▲───────────────────────────────────────┘
                                       │ Operaciones POS & Administración
┌──────────────────────────────────────┴───────────────────────────────────────┐
│                     CONSOLA ADMINISTRATIVA & POS (/admin)                    │
│  • Terminal POS Visual con Fotos (Crear, Modificar, Eliminar Facturas)       │
│  • Gestor de Inventario Fotográfico (Crear/Editar/Eliminar Productos + SKU)  │
│  • Despachos Cartagena (Dispara Push al pasar a Despachado / Entregado)      │
│  • Panel de Plugins, Pasarelas de Pago y Configuración Corporativa           │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Mapeo de Componentes y Estado Interactivo**:
  - **Ciclo de Estados de Pedido Ampliado**: `Pendiente` → `Facturado` → `Despachado` → `Entregado` (y `Cancelado`). Los estados `Facturado`, `Despachado` y `Entregado` mantienen las unidades descontadas del inventario; si una factura se edita, se recalcula el stock; si se anula o elimina, se restituye el stock automáticamente.
  - **Disparador de Notificación Push**: Al cambiar el estado de una orden a `Despachado` o `Entregado`, el servidor registra una notificación vinculada al pedido (`orderNumber`, estado, hora, mensaje desde Cartagena) y el cliente recibe la notificación push nativa del navegador junto con una alerta emergente y actualización en su panel de seguimiento.
