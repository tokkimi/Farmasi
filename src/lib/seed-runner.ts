import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";
import { PRODUCTS } from "@/lib/seed-data/products";
import { NEWS } from "@/lib/seed-data/news";
import { CATEGORY_TREE } from "@/lib/seed-data/categories";
import { SEED_COMPATIBILITY_RULES, SEED_INGREDIENTS } from "@/lib/seed-data/ingredients";
import { cleanCatalogProduct, shouldExcludeProduct } from "@/lib/catalog-cleanup";
import { FARMASI_BRAND } from "@/lib/seed-data/farmasi-catalog";

// Shared database with Haru: every product-touching seeder below is scoped
// to the Farmasi catalogue so Haru's own rows are never read or modified.
const FARMASI_ONLY = { brand: FARMASI_BRAND };

export async function seedProducts(db: PrismaClient): Promise<number> {
  await db.product.deleteMany({
    where: {
      ...FARMASI_ONLY,
      OR: [
        { slug: { contains: "sca_clone_freegift" } },
        { brand: { in: ["GWP", "Free Gift Ghost"] } },
        { name: { startsWith: "(Free Gift)" } },
        { name: { startsWith: "(FREE)" } },
      ],
    },
  });

  let count = 0;
  for (const p of PRODUCTS) {
    if (shouldExcludeProduct(p)) continue;
    const product = cleanCatalogProduct(p);
    await db.product.upsert({
      where: { slug: product.slug },
      create: { ...product },
      update: { ...product },
    });
    count++;
  }
  return count;
}

// Entries that were in the generated catalog with a non-brand "brand" field
// (order-receipt artifacts like "GWP" / "Free Gift Ghost", not real
// products) — removed from the seed data on 2026-07-12. Upsert-by-slug never
// deletes rows on its own, so these stay orphaned in already-seeded
// databases (and in anyone's shelf) until explicitly removed here.
// Haru-only cleanup list removed: the Farmasi catalogue has no junk rows.
const REMOVED_JUNK_SLUGS: string[] = [];

export async function deleteOrphanedJunkProducts(db: PrismaClient): Promise<number> {
  const result = await db.product.deleteMany({ where: { ...FARMASI_ONLY, slug: { in: REMOVED_JUNK_SLUGS } } });
  return result.count;
}

export async function seedCategories(db: PrismaClient): Promise<number> {
  for (const c of CATEGORY_TREE) {
    await db.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: c,
    });
  }
  return CATEGORY_TREE.length;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes the free-text Product.brand strings already in the catalog into
 * real Brand rows, and links each product's brandId — additive, never
 * touches the existing `brand` text field products still read directly.
 */
export async function seedBrands(db: PrismaClient): Promise<number> {
  const products = await db.product.findMany({ where: FARMASI_ONLY, select: { id: true, brand: true, origin: true } });

  const byBrand = new Map<string, { name: string; origin: string | null; productIds: string[] }>();
  for (const p of products) {
    const key = p.brand.trim().toLowerCase();
    const existing = byBrand.get(key);
    if (existing) {
      existing.productIds.push(p.id);
      if (!existing.origin && p.origin) existing.origin = p.origin;
    } else {
      byBrand.set(key, { name: p.brand.trim(), origin: p.origin, productIds: [p.id] });
    }
  }

  let count = 0;
  for (const { name, origin, productIds } of byBrand.values()) {
    const slug = slugify(name);
    if (!slug) continue;
    const brand = await db.brand.upsert({
      where: { slug },
      create: { slug, name, country: origin },
      update: { name, country: origin ?? undefined },
    });
    await db.product.updateMany({ where: { id: { in: productIds } }, data: { brandId: brand.id } });
    count++;
  }
  return count;
}

/** Backfills a first ProductSource row from each product's existing officialUrl, when present. */
export async function seedProductSources(db: PrismaClient): Promise<number> {
  const products = await db.product.findMany({
    where: { ...FARMASI_ONLY, officialUrl: { not: null } },
    select: { id: true, brand: true, officialUrl: true },
  });

  let count = 0;
  for (const p of products) {
    if (!p.officialUrl) continue;
    const existing = await db.productSource.findFirst({
      where: { productId: p.id, sourceUrl: p.officialUrl },
    });
    if (existing) continue;
    await db.productSource.create({
      data: { productId: p.id, sourceName: `${p.brand} (official site)`, sourceUrl: p.officialUrl },
    });
    count++;
  }
  return count;
}

export async function seedIngredients(db: PrismaClient): Promise<number> {
  for (const ingredient of SEED_INGREDIENTS) {
    await db.ingredient.upsert({
      where: { id: ingredient.id },
      create: ingredient,
      update: ingredient,
    });
  }
  return SEED_INGREDIENTS.length;
}

export async function seedCompatibilityRules(db: PrismaClient): Promise<number> {
  let count = 0;
  for (const rule of SEED_COMPATIBILITY_RULES) {
    await db.compatibilityRule.upsert({
      where: { id: rule.id },
      create: rule,
      update: rule,
    });
    count++;
  }
  return count;
}

export async function seedProductIngredients(db: PrismaClient): Promise<number> {
  const products = await db.product.findMany({ where: FARMASI_ONLY, select: { id: true, ingredientIds: true } });
  const validIngredients = new Set(
    (await db.ingredient.findMany({ select: { id: true } })).map((ingredient) => ingredient.id)
  );

  let count = 0;
  for (const product of products) {
    for (const ingredientId of product.ingredientIds) {
      if (!validIngredients.has(ingredientId)) continue;
      await db.productIngredient.upsert({
        where: { productId_ingredientId: { productId: product.id, ingredientId } },
        create: { productId: product.id, ingredientId },
        update: {},
      });
      count++;
    }
  }
  return count;
}

export async function seedNews(db: PrismaClient): Promise<number> {
  const titles = NEWS.map((item) => item.title);
  await db.newsItem.deleteMany({ where: { title: { notIn: titles } } });

  for (const item of NEWS) {
    const existing = await db.newsItem.findFirst({ where: { title: item.title } });
    if (existing) {
      await db.newsItem.update({
        where: { id: existing.id },
        data: { ...item, publishedAt: new Date(item.publishedAt) },
      });
    } else {
      await db.newsItem.create({ data: { ...item, publishedAt: new Date(item.publishedAt) } });
    }
  }
  return NEWS.length;
}

const DEFAULT_SOUNDS = [
  {
    slug: "white-noise",
    labelEn: "White noise",
    labelKo: "화이트 노이즈",
    descriptionEn: "Even sound for focus or winding down",
    descriptionKo: "집중과 휴식을 위한 균일한 소리",
    sourceType: "synthesis",
    synthesisMode: "white",
    order: 0,
  },
  {
    slug: "pink-noise",
    labelEn: "Pink noise",
    labelKo: "핑크 노이즈",
    descriptionEn: "Softer low-frequency sound",
    descriptionKo: "더 부드럽고 낮은 톤의 소리",
    sourceType: "synthesis",
    synthesisMode: "pink",
    order: 1,
  },
  {
    slug: "rain-texture",
    labelEn: "Rain texture",
    labelKo: "비 소리",
    descriptionEn: "Short reset before an evening routine",
    descriptionKo: "짧은 휴식이나 밤 루틴 전",
    sourceType: "synthesis",
    synthesisMode: "rain",
    order: 2,
  },
  {
    slug: "ocean-texture",
    labelEn: "Ocean texture",
    labelKo: "파도 소리",
    descriptionEn: "Use with slow breathing",
    descriptionKo: "느린 호흡과 함께 사용",
    sourceType: "synthesis",
    synthesisMode: "ocean",
    order: 3,
  },
  {
    slug: "tone-432",
    labelEn: "432 Hz tone",
    labelKo: "432 Hz 톤",
    descriptionEn: "A simple relaxation tone",
    descriptionKo: "휴식 분위기를 위한 단순한 톤",
    sourceType: "synthesis",
    synthesisMode: "calm432",
    order: 4,
  },
  {
    slug: "tone-528",
    labelEn: "528 Hz tone",
    labelKo: "528 Hz 톤",
    descriptionEn: "For calm listening, not medical effect",
    descriptionKo: "의학적 효과가 아닌 편안한 청취용",
    sourceType: "synthesis",
    synthesisMode: "soft528",
    order: 5,
  },
] as const;

export async function seedSounds(db: PrismaClient): Promise<number> {
  for (const sound of DEFAULT_SOUNDS) {
    await db.sound.upsert({
      where: { slug: sound.slug },
      update: sound,
      create: sound,
    });
  }
  return DEFAULT_SOUNDS.length;
}

const ADMIN_EMAIL = "admin@haru.app";
const ADMIN_PASSWORD = "HaruAdmin!2026";
const PREMIUM_EMAIL = "premium-tester@haru.app";
const PREMIUM_PASSWORD = "HaruPremium!2026";

export async function seedTestAccounts(db: PrismaClient) {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "Haru Admin",
      passwordHash: adminHash,
      role: "ADMIN",
    },
    update: { passwordHash: adminHash, role: "ADMIN" },
  });

  const premiumHash = await bcrypt.hash(PREMIUM_PASSWORD, 12);
  const premiumUser = await db.user.upsert({
    where: { email: PREMIUM_EMAIL },
    create: {
      email: PREMIUM_EMAIL,
      name: "Premium Tester",
      passwordHash: premiumHash,
      role: "USER",
      subscriptionStatus: "ACTIVE",
    },
    update: { passwordHash: premiumHash, subscriptionStatus: "ACTIVE" },
  });

  await db.skinProfile.upsert({
    where: { userId: premiumUser.id },
    create: {
      userId: premiumUser.id,
      skinType: "combination",
      concerns: ["acne", "dullness", "pores"],
      ageRange: "20s",
      sensitivities: ["fragrance"],
      climate: "humid",
      goals: [],
      budget: "mid",
    },
    update: {},
  });

  // Give the premium tester a starter shelf pulled from featured products,
  // so the routine/audit/scan flows all have something to show immediately.
  const featured = await db.product.findMany({ where: { ...FARMASI_ONLY, featured: true }, take: 6 });
  for (const product of featured) {
    await db.shelfItem.upsert({
      where: { userId_productId: { userId: premiumUser.id, productId: product.id } },
      create: { userId: premiumUser.id, productId: product.id },
      update: {},
    });
  }

  return {
    adminEmail: ADMIN_EMAIL,
    premiumEmail: PREMIUM_EMAIL,
    premiumShelfItems: featured.length,
  };
}
