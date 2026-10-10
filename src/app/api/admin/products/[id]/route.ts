import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { productAdminSchema } from "@/lib/validation-admin";
import { CATALOG_SCOPE } from "@/lib/products";
import { FARMASI_BRAND } from "@/lib/seed-data/farmasi-catalog";

/** The database is shared with Haru: only Farmasi rows may be edited from here. */
async function isCatalogRow(id: string) {
  return Boolean(await db.product.findFirst({ where: { ...CATALOG_SCOPE, id }, select: { id: true } }));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = productAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }

  if (!(await isCatalogRow(id))) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { price, ...rest } = parsed.data;
  const product = await db.product.update({
    where: { id },
    data: {
      ...rest,
      brand: FARMASI_BRAND,
      fullIngredients: rest.fullIngredients || null,
      origin: rest.origin || null,
      description: rest.description || null,
      imageUrl: rest.imageUrl || null,
      officialUrl: rest.officialUrl || null,
      currency: rest.currency || "EUR",
      price: price ?? null,
    },
  });

  return NextResponse.json({ product });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  if (!(await isCatalogRow(id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await db.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
