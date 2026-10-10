"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ShoppingBag, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product-image";
import { findFarmasiProduct } from "@/lib/seed-data/farmasi-catalog";
import type { Product } from "@/generated/prisma/client";

const SHOP_TABS = ["all", "lip-makeup", "eye-makeup", "face-makeup", "skincare", "fragrance", "personal"] as const;
const SKINCARE = new Set(["cleanser", "toner", "essence", "serum", "eye", "moisturizer", "lip-care"]);
const PERSONAL = new Set(["body", "oral-care", "accessories"]);

function inTab(product: Product, tab: (typeof SHOP_TABS)[number]) {
  if (tab === "all") return true;
  if (tab === "skincare") return SKINCARE.has(product.category);
  if (tab === "personal") return PERSONAL.has(product.category);
  return product.category === tab;
}

function formatPrice(price: number | null) {
  return price == null ? null : `${price.toFixed(2).replace(".", ",").replace(",00", "")} €`;
}

export function ShopSection({ products }: { products: Product[] }) {
  const t = useTranslations("shop");
  const tCategories = useTranslations("categories");
  const [tab, setTab] = useState<(typeof SHOP_TABS)[number]>("all");
  const visible = useMemo(() => products.filter((p) => inTab(p, tab)), [products, tab]);

  return (
    <section id="shop" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
        <h2 className="mt-2 text-balance text-2xl font-semibold md:text-3xl">{t("title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-2">
        {SHOP_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${tab === item ? "bg-primary text-primary-foreground" : "bg-white/[0.07] text-foreground hover:bg-secondary"}`}
          >
            {item === "all" || item === "skincare" || item === "personal" ? t(`tabs.${item}`) : tCategories(item)}
          </button>
        ))}
      </div>

      <div className="haru-scroll-cue no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {visible.map((p, i) => {
          const entry = findFarmasiProduct(p.slug);
          const price = formatPrice(p.price);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: (i % 8) * 0.04 }}
              className="w-44 shrink-0 sm:w-48"
            >
              <Card className="haru-home-product-card h-full gap-0 overflow-hidden p-0">
                <Link href={`/app/product/${p.slug}`}>
                  <ProductImage imageUrl={p.imageUrl} category={p.category} name={p.name} size="lg" />
                </Link>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <Link href={`/app/product/${p.slug}`} className="min-w-0">
                    <p className="truncate text-sm font-medium leading-snug">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tCategories(p.category)}
                      {entry?.shades && entry.shades.length > 1 ? ` · ${t("shades", { count: entry.shades.length })}` : ""}
                    </p>
                  </Link>
                  {entry?.shades && entry.shades.length > 1 && (
                    <div className="mt-1 flex -space-x-1">
                      {entry.shades.slice(0, 7).map((shade) => (
                        <span key={shade.name} className="size-3.5 rounded-full ring-1 ring-card" style={{ background: shade.hex }} />
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="text-sm font-semibold">{price ?? ""}</span>
                    {entry?.tryOn ? (
                      <Link href={`/app/try-on?product=${p.slug}`} aria-label={t("tryOn")} className="rounded-full bg-primary/15 p-2 text-primary">
                        <Sparkles className="size-3.5" />
                      </Link>
                    ) : (
                      <Link href={`/app/product/${p.slug}`} aria-label={t("view")} className="rounded-full bg-white/[0.07] p-2">
                        <ShoppingBag className="size-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/app/try-on">
            <Sparkles className="size-4" />
            {t("tryOnCta")}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/app/products">{t("browseAll")}</Link>
        </Button>
      </div>
    </section>
  );
}
