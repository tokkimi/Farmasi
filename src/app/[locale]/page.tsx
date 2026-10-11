import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/marketing/hero";
import { ScanShowcase } from "@/components/marketing/scan-showcase";
import { AuditShowcase } from "@/components/marketing/audit-showcase";
import { WellnessShowcase } from "@/components/marketing/wellness-showcase";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { SubscriptionPreview } from "@/components/marketing/subscription-preview";
import { VideoGalleryPreview } from "@/components/marketing/video-gallery-preview";
import { BeautyTryOnShowcase } from "@/components/marketing/beauty-try-on-showcase";
import { FinalCta } from "@/components/marketing/final-cta";
import { db } from "@/lib/db";
import { CATALOG_SCOPE, hydrateCatalogProduct } from "@/lib/products";
import { getSeoMetadata } from "@/lib/seo";
import { PRODUCTS } from "@/lib/seed-data/products";
import type { Product } from "@/generated/prisma/client";

const FALLBACK_DATE = new Date("2027-01-01T00:00:00.000Z");

function fallbackProducts(filter?: (product: (typeof PRODUCTS)[number]) => boolean, limit = 10): Product[] {
  return PRODUCTS.filter(filter ?? (() => true))
    .slice(0, limit)
    .map((product) => ({
      id: product.slug,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      category: product.category,
      ingredientIds: product.ingredientIds,
      fullIngredients: product.fullIngredients,
      barcode: null,
      origin: product.origin,
      description: product.description,
      usageSteps: product.usageSteps,
      imageUrl: product.imageUrl ?? null,
      officialUrl: product.officialUrl ?? null,
      price: product.price,
      currency: product.currency,
      skinTypes: product.skinTypes,
      concerns: product.concerns,
      featured: product.featured ?? false,
      createdAt: FALLBACK_DATE,
      updatedAt: FALLBACK_DATE,
      brandId: null,
    }));
}

async function getHomeProducts() {
  const makeupCategories = ["lip-makeup", "eye-makeup", "face-makeup"];
  const skincareCategories = ["cleanser", "toner", "essence", "serum", "eye", "moisturizer", "lip-care"];
  const [makeup, skincare] = await Promise.all([
    db.product
      .findMany({
        where: { ...CATALOG_SCOPE, category: { in: makeupCategories } },
        orderBy: { featured: "desc" },
        take: 12,
      })
      .catch(() => []),
    db.product
      .findMany({
        where: { ...CATALOG_SCOPE, category: { in: skincareCategories } },
        orderBy: { featured: "desc" },
        take: 12,
      })
      .catch(() => []),
  ]);

  return {
    makeup: makeup.length ? makeup.map(hydrateCatalogProduct) : fallbackProducts((product) => makeupCategories.includes(product.category)),
    skincare: skincare.length ? skincare.map(hydrateCatalogProduct) : fallbackProducts((product) => skincareCategories.includes(product.category)),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return getSeoMetadata("/", locale, { title: t("title"), description: t("description") });
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="haru-public flex flex-1 flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Hero />
        <BeautyTryOnShowcase />
        <Suspense fallback={<div className="mx-auto h-80 max-w-6xl rounded-3xl" aria-busy="true" />}><HomeBeautyProducts /></Suspense>
        <WellnessShowcase />
        <Suspense fallback={<div className="mx-auto h-80 max-w-6xl rounded-3xl" aria-busy="true" />}><HomeSkincareProducts /></Suspense>
        <AuditShowcase />
        <VideoGalleryPreview />
        <ScanShowcase />
        <SubscriptionPreview />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

async function HomeBeautyProducts() {
  const products = await getHomeProducts();
  return <ProductShowcase makeup={products.makeup} />;
}

async function HomeSkincareProducts() {
  const products = await getHomeProducts();
  return <ProductShowcase skincare={products.skincare} showIntro={false} />;
}
