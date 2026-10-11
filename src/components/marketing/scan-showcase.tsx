"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Droplets, Eye, ListChecks, ScanFace, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

const CHECK_ICONS = [Camera, ListChecks, Droplets, Sparkles];

export function ScanShowcase() {
  const t = useTranslations("scanShowcase");
  const faceScan = useTranslations("faceScanPage");
  const shop = useTranslations("shop");
  const checks = t.raw("checks") as { title: string; text: string }[];

  return (
    <section id="scanner" className="scroll-mt-24 pb-20 pt-4">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#171313] px-6 py-8 text-white shadow-[0_24px_80px_rgba(58,28,27,.22)] sm:px-10 sm:py-12"
        >
          <div className="absolute -right-28 -top-32 size-96 rounded-full bg-[#b87878]/30 blur-3xl" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
            <div className="max-w-xl text-left">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-[.12em] text-white/90">
                <Sparkles className="size-3" aria-hidden="true" /> BEAUTY TECH
              </p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{faceScan("title")}</h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/72">{t("subtitle")}</p>
              <p className="mt-5 text-xs leading-relaxed text-white/52">{t("note")}</p>
            </div>
            <div className="grid w-full gap-3 self-stretch sm:grid-cols-2 lg:grid-cols-1">
              <Link href="/app/try-on" className="group flex min-h-40 flex-col justify-between rounded-[1.5rem] border border-[#ffd7e5]/35 bg-[#351b2b] p-6 shadow-[0_18px_45px_rgba(0,0,0,.18)] transition hover:-translate-y-1 hover:bg-[#452238]" aria-label={shop("tryOnCta")}>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#ffd5e3] text-[#62223e]"><Eye className="size-5" aria-hidden="true" /></span>
                <span><span className="flex items-center gap-2 text-lg font-bold text-white">{shop("tryOnCta")} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span><span className="mt-1 block text-sm text-white/65">Live · lèvres · teint · yeux</span></span>
              </Link>
              <Link href="/app/face-scan" className="group flex min-h-40 flex-col justify-between rounded-[1.5rem] border border-white/15 bg-white/[0.07] p-6 shadow-[0_18px_45px_rgba(0,0,0,.14)] transition hover:-translate-y-1 hover:bg-white/[0.12]">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 text-[#ffd3c7]"><ScanFace className="size-5" aria-hidden="true" /></span>
                <span><span className="flex items-center gap-2 text-lg font-bold text-white">{faceScan("title")} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span><span className="mt-1 block text-sm text-white/65">Analyse cosmétique guidée</span></span>
              </Link>
              <Link href="/app/scan" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-5 text-sm font-medium text-white/82 transition hover:bg-white/10 sm:col-span-2 lg:col-span-1">
                <Camera className="size-4" aria-hidden="true" />
                {t("ctaPrimary")}
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mt-12"
        >
          <div className="no-scrollbar -mx-6 flex gap-4 overflow-x-auto px-6 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0">
            {checks.map((check, index) => {
              const Icon = CHECK_ICONS[index] ?? Sparkles;
              return (
                <div
                  key={check.title}
                  className="haru-glow-card w-[calc((100vw-4rem)/2)] min-w-[calc((100vw-4rem)/2)] rounded-[1.15rem] p-4 lg:w-auto lg:min-w-0"
                >
                  <span className="haru-icon-halo mb-4 flex size-10 shrink-0 items-center justify-center rounded-full text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{check.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{check.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
