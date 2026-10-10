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
import { RoutineLabPreview } from "@/components/marketing/routine-lab-preview";
import { KBeautyRoutineBuilder } from "@/components/marketing/kbeauty-routine-builder";
import { BeautyNews } from "@/components/marketing/beauty-news";
import { FinalCta } from "@/components/marketing/final-cta";
import { db } from "@/lib/db";
import { CATALOG_SCOPE } from "@/lib/products";
import { getRecentNews } from "@/lib/news-queries";
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
  const routineSlugs = [
    "farmasi-dr-c-tuna-resurface-refining-cleanser",
    "farmasi-dr-c-tuna-resurface-hydrasooth-essence",
    "farmasi-dr-c-tuna-resurface-retinol-reviving-serum",
    "farmasi-dr-c-tuna-resurface-reset-night-cream",
    "farmasi-dr-c-tuna-age-reversist-exfoliating-cleanser",
    "farmasi-dr-c-tuna-age-reversist-beauty-essence-tonic",
    "farmasi-dr-c-tuna-resurface-advanced-eye-cream",
    "farmasi-dr-c-tuna-resurface-essential-day-cream",
    "farmasi-vfx-pro-blur-primer",
    "farmasi-vfx-pro-camera-ready-foundation",
    "farmasi-blush-stick",
    "farmasi-vfx-pro-time-locker-fixing-spray",
  ];
  const makeupCategories = ["lip-makeup", "eye-makeup", "face-makeup"];
  const [latest, makeup, routinePicks] = await Promise.all([
    db.product
      .findMany({ where: CATALOG_SCOPE, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 12 })
      .catch(() => []),
    db.product
      .findMany({
        where: { ...CATALOG_SCOPE, category: { in: makeupCategories } },
        orderBy: { featured: "desc" },
        take: 12,
      })
      .catch(() => []),
    db.product.findMany({ where: { ...CATALOG_SCOPE, slug: { in: routineSlugs } } }).catch(() => []),
  ]);

  return {
    latest: latest.length ? latest : fallbackProducts((product) => !!product.featured || product.category !== "accessories"),
    makeup: makeup.length ? makeup : fallbackProducts((product) => makeupCategories.includes(product.category)),
    routinePicks: routinePicks.length
      ? routinePicks
      : fallbackProducts((product) => routineSlugs.includes(product.slug), routineSlugs.length),
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
        <WellnessShowcase />
        <RoutineLabPreview />
        <SubscriptionPreview />
        <VideoGalleryPreview />
        <ScanShowcase />
        <AuditShowcase />
        <Suspense fallback={<div className="h-[48rem]" aria-busy="true" />}><HomeRoutineBuilder /></Suspense>
        <Suspense fallback={<div className="mx-auto h-80 max-w-6xl rounded-3xl" aria-busy="true" />}><HomeProducts /></Suspense>
        <Suspense fallback={null}><HomeNews /></Suspense>
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

async function HomeProducts() {
  const products = await getHomeProducts();
  return <ProductShowcase latest={products.latest} madeInKorea={products.makeup} />;
}

async function HomeRoutineBuilder() {
  const products = await getHomeProducts();
  return <KBeautyRoutineBuilder products={products.routinePicks} />;
}

async function HomeNews() {
  return <BeautyNews items={await getRecentNews(24)} />;
}
