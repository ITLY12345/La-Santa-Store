import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/server-db';
import { Producto } from '@/lib/data';

export async function GET() {
  const db = readDb();
  return NextResponse.json({ products: db.products });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = readDb();

    const newProduct: Producto = {
      id: body.id || `prod-${Date.now()}`,
      referencia: body.referencia || `REF-${Math.floor(100 + Math.random() * 900)}`,
      nombre: (body.nombre || 'Nuevo Producto').trim(),
      categoria: body.categoria || 'Camisetas',
      marca_motivo: (body.marca_motivo || 'Colección Oficial').trim(),
      descripcion: (body.descripcion || '').trim(),
      imagenes:
        Array.isArray(body.imagenes) && body.imagenes.length > 0
          ? body.imagenes
          : [
              'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85',
            ],
      precio_base: Math.max(0, Number(body.precio_base) || 0),
      configuracion_alertas: {
        stock_minimo_alerta: Math.max(
          0,
          Number(body.configuracion_alertas?.stock_minimo_alerta ?? 4)
        ),
      },
      variantes:
        Array.isArray(body.variantes) && body.variantes.length > 0
          ? body.variantes
          : [
              {
                id_variante: `var-${Date.now()}-1`,
                sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                talla: 'Única',
                color: 'Negro Mate',
                diseno_motivo: 'Edición Oficial',
                stock_disponible: 10,
              },
            ],
    };

    db.products = [newProduct, ...db.products];
    const saved = writeDb(db);
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
  try {
    const body = await req.json();
    const db = readDb();

    // Quick stock update for a single variant
    if (body.action === 'updateStock') {
      const { productoId, varianteId, newStock } = body;
      db.products = db.products.map((prod) => {
        if (prod.id !== productoId) return prod;
        return {
          ...prod,
          variantes: prod.variantes.map((v) =>
            v.id_variante === varianteId
              ? { ...v, stock_disponible: Math.max(0, Number(newStock) || 0) }
              : v
          ),
        };
      });
      const saved = writeDb(db);
      return NextResponse.json({ success: true, products: saved.products });
    }

    // Quick threshold update
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
      const saved = writeDb(db);
      return NextResponse.json({ success: true, products: saved.products });
    }

    // Full product update (with photos, details, and variants)
    if (body.product && body.product.id) {
      const updatedProd: Producto = body.product;
      db.products = db.products.map((p) => (p.id === updatedProd.id ? updatedProd : p));
      const saved = writeDb(db);
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
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID de producto requerido.' },
        { status: 400 }
      );
    }

    const db = readDb();
    db.products = db.products.filter((p) => p.id !== id);
    const saved = writeDb(db);
    return NextResponse.json({ success: true, products: saved.products });
  } catch (err) {
    console.error('DELETE /api/products error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al eliminar el producto.' },
      { status: 500 }
    );
  }
}
