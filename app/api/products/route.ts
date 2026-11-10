import { NextRequest, NextResponse } from 'next/server';
import { readDbAsync, writeDbAsync, buildKardexMove } from '@/lib/server-db';
import { Producto } from '@/lib/data';
import { isAdminRequest, unauthorizedResponse } from '@/lib/auth';

const MAX_IMAGE_STRING_LENGTH = 350_000; // ~250KB max compressed Base64 / URL

function validateImagesArray(imagenes: unknown): { valid: boolean; sanitized: string[]; error?: string } {
  const defaultImg =
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85';
  if (!Array.isArray(imagenes) || imagenes.length === 0) {
    return { valid: true, sanitized: [defaultImg] };
  }
  const sanitized: string[] = [];
  for (const raw of imagenes.slice(0, 8)) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const trimmed = raw.trim();
    if (trimmed.length > MAX_IMAGE_STRING_LENGTH) {
      return {
        valid: false,
        sanitized: [],
        error:
          'La imagen excede el tamaño máximo permitido (250 KB comprimida). Usa el cargador automático o una URL externa.',
      };
    }
    sanitized.push(trimmed);
  }
  return { valid: true, sanitized: sanitized.length > 0 ? sanitized : [defaultImg] };
}

export async function GET() {
  const db = await readDbAsync();
  return NextResponse.json({ products: db.products });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const imgCheck = validateImagesArray(body.imagenes);
    if (!imgCheck.valid) {
      return NextResponse.json({ success: false, message: imgCheck.error }, { status: 413 });
    }

    const db = await readDbAsync();

    const newProduct: Producto = {
      id: body.id || `prod-${Date.now()}`,
      referencia: (body.referencia || `REF-${Math.floor(100 + Math.random() * 900)}`).trim().slice(0, 64),
      nombre: (body.nombre || 'Nuevo Producto').trim().slice(0, 160),
      categoria: body.categoria || 'Camisetas',
      marca_motivo: (body.marca_motivo || 'Colección Oficial').trim().slice(0, 100),
      descripcion: (body.descripcion || '').trim().slice(0, 1000),
      imagenes: imgCheck.sanitized,
      precio_base: Math.max(0, Number(body.precio_base) || 0),
      precio_mayorista:
        body.precio_mayorista !== undefined && Number(body.precio_mayorista) > 0
          ? Math.max(0, Number(body.precio_mayorista) || 0)
          : undefined,
      costo_unitario: Math.max(0, Number(body.costo_unitario) || 0),
      iva_porcentaje: Math.max(0, Number(body.iva_porcentaje ?? 19)),
      configuracion_alertas: {
        stock_minimo_alerta: Math.max(
          0,
          Number(body.configuracion_alertas?.stock_minimo_alerta ?? 4)
        ),
      },
      variantes:
        Array.isArray(body.variantes) && body.variantes.length > 0
          ? body.variantes.map((v: Producto['variantes'][number]) => ({
              ...v,
              diseno_motivo: '',
              stock_disponible: Math.max(0, Number(v.stock_disponible) || 0),
              stock_punto_venta: Math.max(0, Number(v.stock_punto_venta) || 0),
              stock_consignacion: Math.max(0, Number(v.stock_consignacion) || 0),
            }))
          : [
              {
                id_variante: `var-${Date.now()}-1`,
                sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                talla: 'Única',
                color: 'Negro',
                diseno_motivo: '',
                stock_disponible: 10,
                stock_punto_venta: 0,
                stock_consignacion: 0,
              },
            ],
    };

    const existingIdx = db.products.findIndex(
      (p) =>
        p.id === newProduct.id ||
        (p.nombre.trim().toLowerCase() === newProduct.nombre.trim().toLowerCase() &&
          p.categoria === newProduct.categoria &&
          p.precio_base === newProduct.precio_base &&
          (p.imagenes[0] || '').slice(0, 120) === (newProduct.imagenes[0] || '').slice(0, 120))
    );

    if (existingIdx > -1) {
      db.products[existingIdx] = {
        ...newProduct,
        id: db.products[existingIdx].id,
      };
    } else {
      db.products = [newProduct, ...db.products];
    }

    const saved = await writeDbAsync(db);
    return NextResponse.json({ success: true, product: newProduct, products: saved.products });
  } catch (err) {
    console.error('POST /api/products error:', err);
    return NextResponse.json(
      { success: false, message: 'No se pudo crear el producto.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const db = await readDbAsync();

    if (body.action === 'updateStock') {
      const { productoId, varianteId, newStock } = body;
      const targetStock = Math.max(0, Number(newStock) || 0);
      const newMoves = [...(db.stockMoves || [])];

      db.products = db.products.map((prod) => {
        if (prod.id !== productoId) return prod;
        return {
          ...prod,
          variantes: prod.variantes.map((v) => {
            if (v.id_variante !== varianteId) return v;
            const prevStock = v.stock_disponible;
            const delta = targetStock - prevStock;
            if (delta !== 0) {
              newMoves.unshift(
                buildKardexMove({
                  varianteId: v.id_variante,
                  sku: v.sku || v.id_variante,
                  productoNombre: prod.nombre,
                  talla: v.talla,
                  color: v.color,
                  documentoRef: 'INV-MANUAL',
                  tipoMovimiento:
                    delta > 0 ? 'ENTRADA_COMPRA' : 'AJUSTE_INVENTARIO',
                  cantidad: delta,
                  stockAnterior: prevStock,
                  stockResultante: targetStock,
                  motivo:
                    delta > 0
                      ? 'Reposición manual de inventario en consola POS'
                      : 'Ajuste manual de existencias en consola POS',
                })
              );
            }
            const res = v.stock_reservado || 0;
            return {
              ...v,
              stock_disponible: targetStock,
              stock_fisico: targetStock + res,
            };
          }),
        };
      });
      db.stockMoves = newMoves.slice(0, 500);
      const saved = await writeDbAsync(db);
      return NextResponse.json({
        success: true,
        products: saved.products,
        stockMoves: saved.stockMoves,
      });
    }

    if (body.action === 'transferWarehouse') {
      const {
        productoId,
        varianteId,
        tipo,
        cantidad,
        destinoNombre,
        precioUnitarioPactado,
        notas,
      } = body as {
        productoId: string;
        varianteId: string;
        tipo: 'BODEGA_A_POS' | 'POS_A_BODEGA' | 'SALIDA_CONSIGNACION' | 'RETORNO_CONSIGNACION';
        cantidad: number;
        destinoNombre?: string;
        precioUnitarioPactado?: number;
        notas?: string;
      };

      const qty = Math.max(1, Math.floor(Number(cantidad) || 0));
      if (!qty) {
        return NextResponse.json(
          { success: false, message: 'La cantidad del traslado debe ser al menos 1 unidad.' },
          { status: 400 }
        );
      }

      const targetProd = db.products.find((p) => p.id === productoId);
      const targetVar = targetProd?.variantes.find((v) => v.id_variante === varianteId);
      if (!targetProd || !targetVar) {
        return NextResponse.json(
          { success: false, message: 'Producto o variante no encontrada para el traslado.' },
          { status: 404 }
        );
      }

      const dispBodega = targetVar.stock_disponible || 0;
      const dispPos = targetVar.stock_punto_venta || 0;
      const dispConsig = targetVar.stock_consignacion || 0;

      if (tipo === 'BODEGA_A_POS' && dispBodega < qty) {
        return NextResponse.json(
          {
            success: false,
            message: `Stock insuficiente en Bodega Principal (${dispBodega} un. disponibles).`,
          },
          { status: 400 }
        );
      }
      if (tipo === 'POS_A_BODEGA' && dispPos < qty) {
        return NextResponse.json(
          {
            success: false,
            message: `Stock insuficiente en Punto de Venta POS (${dispPos} un. disponibles).`,
          },
          { status: 400 }
        );
      }
      if (tipo === 'SALIDA_CONSIGNACION' && dispBodega + dispPos < qty) {
        return NextResponse.json(
          {
            success: false,
            message: `Stock disponible insuficiente para enviar en consignación (${dispBodega + dispPos} un.).`,
          },
          { status: 400 }
        );
      }
      if (tipo === 'RETORNO_CONSIGNACION' && dispConsig < qty) {
        return NextResponse.json(
          {
            success: false,
            message: `No hay suficientes unidades en consignación para retornar (${dispConsig} un. en consignación).`,
          },
          { status: 400 }
        );
      }

      const newMoves = [...(db.stockMoves || [])];
      const docCode = `TR-${Math.floor(1000 + Math.random() * 9000)}`;

      db.products = db.products.map((prod) => {
        if (prod.id !== productoId) return prod;
        return {
          ...prod,
          variantes: prod.variantes.map((v) => {
            if (v.id_variante !== varianteId) return v;
            let nextBodega = v.stock_disponible || 0;
            let nextPos = v.stock_punto_venta || 0;
            let nextConsig = v.stock_consignacion || 0;
            const prevBodega = nextBodega;

            let moveType: 'TRASLADO_BODEGA_POS' | 'SALIDA_CONSIGNACION' | 'RETORNO_CONSIGNACION' =
              'TRASLADO_BODEGA_POS';
            let motivoDetalle = '';

            if (tipo === 'BODEGA_A_POS') {
              nextBodega = Math.max(0, nextBodega - qty);
              nextPos += qty;
              moveType = 'TRASLADO_BODEGA_POS';
              motivoDetalle = `Traslado Bodega Principal → Punto de Venta (${qty} un.)${
                destinoNombre ? ` · Resp: ${destinoNombre}` : ''
              }${
                precioUnitarioPactado
                  ? ` · Precio salida: $${precioUnitarioPactado.toLocaleString('es-CO')}`
                  : ''
              }${notas ? ` · ${notas}` : ''}`;
            } else if (tipo === 'POS_A_BODEGA') {
              nextPos = Math.max(0, nextPos - qty);
              nextBodega += qty;
              moveType = 'TRASLADO_BODEGA_POS';
              motivoDetalle = `Retorno Punto de Venta → Bodega Principal (${qty} un.)${
                notas ? ` · ${notas}` : ''
              }`;
            } else if (tipo === 'SALIDA_CONSIGNACION') {
              const fromBodega = Math.min(nextBodega, qty);
              const fromPos = qty - fromBodega;
              nextBodega = Math.max(0, nextBodega - fromBodega);
              nextPos = Math.max(0, nextPos - fromPos);
              nextConsig += qty;
              moveType = 'SALIDA_CONSIGNACION';
              motivoDetalle = `Salida en Consignación (${qty} un.)${
                destinoNombre ? ` · Cliente/Aliado: ${destinoNombre}` : ''
              }${
                precioUnitarioPactado
                  ? ` · Precio consignación: $${precioUnitarioPactado.toLocaleString('es-CO')}`
                  : ''
              }${notas ? ` · ${notas}` : ''}`;
            } else if (tipo === 'RETORNO_CONSIGNACION') {
              nextConsig = Math.max(0, nextConsig - qty);
              nextBodega += qty;
              moveType = 'RETORNO_CONSIGNACION';
              motivoDetalle = `Retorno de Consignación → Bodega Principal (${qty} un.)${
                destinoNombre ? ` · De: ${destinoNombre}` : ''
              }${notas ? ` · ${notas}` : ''}`;
            }

            newMoves.unshift(
              buildKardexMove({
                varianteId: v.id_variante,
                sku: v.sku || v.id_variante,
                productoNombre: prod.nombre,
                talla: v.talla,
                color: v.color,
                documentoRef: docCode,
                tipoMovimiento: moveType,
                cantidad:
                  tipo === 'BODEGA_A_POS' || tipo === 'SALIDA_CONSIGNACION'
                    ? -qty
                    : qty,
                stockAnterior: prevBodega,
                stockResultante: nextBodega,
                motivo: motivoDetalle,
              })
            );

            return {
              ...v,
              stock_disponible: nextBodega,
              stock_punto_venta: nextPos,
              stock_consignacion: nextConsig,
              stock_fisico:
                nextBodega + (v.stock_reservado || 0) + nextPos + nextConsig,
            };
          }),
        };
      });

      db.stockMoves = newMoves.slice(0, 500);
      const saved = await writeDbAsync(db);
      return NextResponse.json({
        success: true,
        products: saved.products,
        stockMoves: saved.stockMoves,
      });
    }

    if (body.action === 'updateThreshold') {
      const { productoId, newThreshold } = body;
      db.products = db.products.map((prod) => {
        if (prod.id !== productoId) return prod;
        return {
          ...prod,
          configuracion_alertas: {
            stock_minimo_alerta: Math.max(0, Number(newThreshold) || 0),
          },
        };
      });
      const saved = await writeDbAsync(db);
      return NextResponse.json({ success: true, products: saved.products });
    }

    if (body.product && body.product.id) {
      const imgCheck = validateImagesArray(body.product.imagenes);
      if (!imgCheck.valid) {
        return NextResponse.json({ success: false, message: imgCheck.error }, { status: 413 });
      }
      const updatedProd: Producto = {
        ...body.product,
        imagenes: imgCheck.sanitized,
        variantes: Array.isArray(body.product.variantes)
          ? body.product.variantes.map((v: Producto['variantes'][number]) => ({
              ...v,
              diseno_motivo: '',
            }))
          : [],
      };
      db.products = db.products.map((p) => (p.id === updatedProd.id ? updatedProd : p));
      const saved = await writeDbAsync(db);
      return NextResponse.json({
        success: true,
        product: updatedProd,
        products: saved.products,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Solicitud de actualización inválida.' },
      { status: 400 }
    );
  } catch (err) {
    console.error('PUT /api/products error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar el producto.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID de producto requerido.' },
        { status: 400 }
      );
    }

    const db = await readDbAsync();
    db.products = db.products.filter((p) => p.id !== id);
    const saved = await writeDbAsync(db);
    return NextResponse.json({ success: true, products: saved.products });
  } catch (err) {
    console.error('DELETE /api/products error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al eliminar el producto.' },
      { status: 500 }
    );
  }
}
