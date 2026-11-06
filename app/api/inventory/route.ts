import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/server-db';
import { isAdminRequest, unauthorizedResponse } from '@/lib/auth';

/**
 * GET /api/inventory
 * Retrieves inventory matrix, stock levels by variant, low-stock alerts and valuations
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const categoria = searchParams.get('categoria');
    const search = searchParams.get('search')?.toLowerCase().trim();
    const soloAlertas = searchParams.get('alertas') === 'true';

    const db = readDb();
    let inventory = db.products;

    if (categoria && categoria !== 'Todas') {
      inventory = inventory.filter((p) => p.categoria === categoria);
    }

    if (search) {
      inventory = inventory.filter((p) => {
        const matchName = p.nombre.toLowerCase().includes(search);
        const matchRef = p.referencia?.toLowerCase().includes(search) ?? false;
        const matchBrand = p.marca_motivo.toLowerCase().includes(search);
        return matchName || matchRef || matchBrand;
      });
    }

    if (soloAlertas) {
      inventory = inventory.filter((p) => {
        const threshold = p.configuracion_alertas?.stock_minimo_alerta ?? 3;
        return p.variantes.some((v) => v.stock_disponible <= threshold);
      });
    }

    let totalUnidades = 0;
    let valoracionInventario = 0;
    let itemsAgotados = 0;
    let itemsBajoStock = 0;

    db.products.forEach((p) => {
      const threshold = p.configuracion_alertas?.stock_minimo_alerta ?? 3;
      p.variantes.forEach((v) => {
        totalUnidades += v.stock_disponible;
        valoracionInventario += v.stock_disponible * p.precio_base;
        if (v.stock_disponible === 0) itemsAgotados++;
        else if (v.stock_disponible <= threshold) itemsBajoStock++;
      });
    });

    return NextResponse.json({
      success: true,
      products: inventory,
      resumen: {
        totalArticulos: db.products.length,
        totalUnidades,
        valoracionInventario,
        itemsAgotados,
        itemsBajoStock,
      },
    });
  } catch (err) {
    console.error('GET /api/inventory error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al consultar inventario.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory
 * Quick updates for stock quantities and thresholds across variants
 */
export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { action, productoId, varianteId, newStock, newThreshold } = body;
    const db = readDb();

    if (action === 'updateVariantStock') {
      db.products = db.products.map((p) => {
        if (p.id !== productoId) return p;
        return {
          ...p,
          variantes: p.variantes.map((v) =>
            v.id_variante === varianteId
              ? { ...v, stock_disponible: Math.max(0, Number(newStock) || 0) }
              : v
          ),
        };
      });
      const saved = writeDb(db);
      return NextResponse.json({ success: true, products: saved.products });
    }

    if (action === 'updateThreshold') {
      db.products = db.products.map((p) => {
        if (p.id !== productoId) return p;
        return {
          ...p,
          configuracion_alertas: {
            stock_minimo_alerta: Math.max(0, Number(newThreshold) || 0),
          },
        };
      });
      const saved = writeDb(db);
      return NextResponse.json({ success: true, products: saved.products });
    }

    return NextResponse.json(
      { success: false, message: 'Acción de inventario desconocida.' },
      { status: 400 }
    );
  } catch (err) {
    console.error('PUT /api/inventory error:', err);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar inventario.' },
      { status: 500 }
    );
  }
}
