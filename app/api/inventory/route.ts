import { NextRequest, NextResponse } from 'next/server';
import { readDbAsync, writeDbAsync, buildKardexMove } from '@/lib/server-db';
import { isAdminRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const categoria = searchParams.get('categoria');
    const search = searchParams.get('search')?.toLowerCase().trim();
    const soloAlertas = searchParams.get('alertas') === 'true';

    const db = await readDbAsync();
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
      stockMoves: db.stockMoves || [],
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

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { action, productoId, varianteId, newStock, newThreshold, motivo } =
      body;
    const db = await readDbAsync();

    if (action === 'updateVariantStock') {
      const targetStock = Math.max(0, Number(newStock) || 0);
      const newMoves = [...(db.stockMoves || [])];

      db.products = db.products.map((p) => {
        if (p.id !== productoId) return p;
        return {
          ...p,
          variantes: p.variantes.map((v) => {
            if (v.id_variante !== varianteId) return v;
            const prevStock = v.stock_disponible;
            const delta = targetStock - prevStock;
            if (delta !== 0) {
              newMoves.unshift(
                buildKardexMove({
                  varianteId: v.id_variante,
                  sku: v.sku || v.id_variante,
                  productoNombre: p.nombre,
                  talla: v.talla,
                  color: v.color,
                  documentoRef: 'INV-MANUAL',
                  tipoMovimiento:
                    delta > 0 ? 'ENTRADA_COMPRA' : 'AJUSTE_INVENTARIO',
                  cantidad: delta,
                  stockAnterior: prevStock,
                  stockResultante: targetStock,
                  motivo:
                    typeof motivo === 'string' && motivo.trim()
                      ? motivo.trim()
                      : delta > 0
                      ? 'Ingreso manual de existencias en bodega Cartagena'
                      : 'Ajuste manual de inventario en consola POS',
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

    if (action === 'updateThreshold') {
      db.products = db.products.map((p) => {
        if (p.id !== productoId) return p;
        return {
          ...p,
          configuracion_alertas: {
            ...p.configuracion_alertas,
            stock_minimo_alerta: Math.max(0, Number(newThreshold) || 0),
          },
        };
      });
      const saved = await writeDbAsync(db);
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
