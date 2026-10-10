"use client";

import { useTranslations } from "next-intl";
import { Heart, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product-image";
import { FARMASI_CATALOG, findFarmasiProduct } from "@/lib/seed-data/farmasi-catalog";
import { useBeautyFavorites } from "@/lib/beauty-favorites";
import type { Product } from "@/generated/prisma/client";

const MAKEUP_CATEGORIES = new Set(["face-makeup", "eye-makeup", "lip-makeup", "lip-care"]);

/** Makeup routines composed only from the Farmasi catalogue (slug + shade index). */
const MAKEUP_ROUTINES = [
  {
    key: "natural",
    steps: [
      ["farmasi-vfx-pro-blur-primer", -1],
      ["farmasi-bb-cream-beauty-balm", 2],
      ["farmasi-blush-stick", 3],
      ["farmasi-zen-mascara", 0],
      ["farmasi-glowy-peptide-lip-balm", 0],
    ],
  },
  {
    key: "office",
    steps: [
      ["farmasi-vfx-pro-camera-ready-foundation", 7],
      ["farmasi-vfx-pro-liquid-concealer", 2],
      ["farmasi-precision-brow-pencil", 1],
      ["farmasi-mirage-palette", 0],
      ["farmasi-double-lash-extend-mascara", 0],
      ["farmasi-creamy-lipstick", 5],
      ["farmasi-vfx-pro-time-locker-fixing-spray", -1],
    ],
  },
  {
    key: "glow",
    steps: [
      ["farmasi-vfx-pro-illuminating-primer", 0],
      ["farmasi-cc-cream-color-correct", 2],
      ["farmasi-peach-perfect-palette", 0],
      ["farmasi-effortless-glow-palette", 0],
      ["farmasi-ultimate-shine-lip-gloss", 4],
    ],
  },
  {
    key: "evening",
    steps: [
      ["farmasi-vfx-pro-camera-ready-foundation", 7],
      ["farmasi-contour-stick", 1],
      ["farmasi-velvet-dusk-palette", 0],
      ["farmasi-ink-liner", 0],
      ["farmasi-intense-lift-mascara", 0],
      ["farmasi-lip-liner", 0],
      ["farmasi-matte-liquid-lipstick", 5],
      ["farmasi-vfx-pro-time-locker-fixing-spray", -1],
    ],
  },
] as const;

function lookParam(steps: readonly (readonly [string, number])[]) {
  return steps
    .filter(([slug, shade]) => shade >= 0 && findFarmasiProduct(slug)?.tryOn)
    .map(([slug, shade]) => `${slug}:${shade}`)
    .join(",");
}

export function BeautyRoutinePanel({ shelf }: { shelf: Product[] }) {
  const t = useTranslations("beautyRoutine");
  const tCategories = useTranslations("categories");
  const favorites = useBeautyFavorites();
  const myMakeup = shelf.filter((p) => MAKEUP_CATEGORIES.has(p.category));

  return (
    <div className="grid min-w-0 gap-5">
      <Card className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button asChild className="rounded-full">
            <Link href="/app/try-on">
              <Sparkles className="size-4" />
              {t("openTryOn")}
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {MAKEUP_ROUTINES.map((routine) => (
          <Card key={routine.key} className="min-w-0 gap-3">
            <div>
              <p className="font-semibold">{t(`routines.${routine.key}.title`)}</p>
              <p className="text-sm text-muted-foreground">{t(`routines.${routine.key}.note`)}</p>
            </div>
            <ol className="grid gap-2">
              {routine.steps.map(([slug, shade], index) => {
                const product = findFarmasiProduct(slug);
                if (!product) return null;
                const shadeName = shade >= 0 ? product.shades?.[shade]?.name : null;
                return (
                  <li key={slug}>
                    <Link href={`/app/product/${slug}`} className="flex min-w-0 items-center gap-3 rounded-xl p-1 transition hover:bg-white/[0.035]">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs">{index + 1}</span>
                      {shadeName && product.shades?.[shade] && (
                        <span className="size-4 shrink-0 rounded-full ring-1 ring-border" style={{ background: product.shades[shade].hex }} />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {shadeName ?? tCategories(product.category)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <Button asChild variant="outline" size="sm" className="w-fit rounded-full">
              <Link href={`/app/try-on?look=${encodeURIComponent(lookParam(routine.steps))}`}>
                <Sparkles className="size-4" />
                {t("tryLook")}
              </Link>
            </Button>
          </Card>
        ))}
      </div>

      <Card className="gap-3">
        <h3 className="flex items-center gap-2 font-serif text-lg">
          <Heart className="size-4 text-primary" />
          {t("favoritesTitle")}
        </h3>
        {favorites.list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("favoritesEmpty")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {favorites.list.map((fav) => {
              const product = FARMASI_CATALOG.find((p) => p.slug === fav.slug);
              const shade = product?.shades?.[fav.shade];
              if (!product || !shade) return null;
              return (
                <div key={`${fav.slug}-${fav.shade}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-2">
                  <span className="size-8 shrink-0 rounded-full ring-1 ring-border" style={{ background: shade.hex }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{product.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {shade.name}
                      {shade.code ? ` · ${shade.code}` : ""}
                    </span>
                  </span>
                  <Link href={`/app/try-on?look=${encodeURIComponent(`${fav.slug}:${fav.shade}`)}`} className="shrink-0 rounded-full p-2 text-primary" aria-label={t("tryLook")}>
                    <Sparkles className="size-4" />
                  </Link>
                  <button type="button" onClick={() => favorites.toggle(fav.slug, fav.shade)} className="shrink-0 rounded-full p-2 text-primary" aria-label={t("removeFavorite")}>
                    <Heart className="size-4 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="gap-3">
        <h3 className="font-serif text-lg">{t("myMakeupTitle")}</h3>
        {myMakeup.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("myMakeupEmpty")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myMakeup.map((p) => (
              <Link key={p.id} href={`/app/product/${p.slug}`} className="flex min-w-0 items-center gap-3">
                <ProductImage imageUrl={p.imageUrl} category={p.category} name={p.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{tCategories(p.category)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/app/products?category=lip-makeup">{t("browseMakeup")}</Link>
        </Button>
      </Card>
    </div>
  );
}
