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
            }))
          : [
              {
                id_variante: `var-${Date.now()}-1`,
                sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                talla: 'Única',
                color: 'Negro',
                diseno_motivo: '',
                stock_disponible: 10,
              },
            ],
    };

    db.products = [newProduct, ...db.products];
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
