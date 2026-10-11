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
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link href="/app/try-on" className="group inline-flex min-h-16 items-center justify-center gap-2 rounded-[1.2rem] bg-gradient-to-r from-[#ffcfdd] via-[#ed9db7] to-[#b86b91] px-6 text-base font-bold text-[#2a101c] shadow-[0_12px_32px_rgba(255,142,184,.28)] transition hover:-translate-y-0.5 hover:brightness-105">
                  <Sparkles className="size-5 transition group-hover:rotate-12" aria-hidden="true" />
                  {shop("tryOnCta")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/app/face-scan" className="inline-flex min-h-16 items-center justify-center gap-2 rounded-[1.2rem] border border-white/25 bg-white/8 px-6 text-base font-semibold text-white transition hover:bg-white/14">
                  <ScanFace className="size-5" aria-hidden="true" />
                  {faceScan("title")}
                </Link>
                <Link href="/app/scan" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-5 text-sm font-medium text-white/82 transition hover:bg-white/10 sm:col-span-2">
                  <Camera className="size-4" aria-hidden="true" />
                  {t("ctaPrimary")}
                </Link>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-white/52">{t("note")}</p>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute inset-4 rounded-[2rem] border border-[#facbc4]/50" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/skin-scanner-phone-preview.png" alt="Aperçu du scanner de peau Farmasi" className="relative mx-auto w-full drop-shadow-2xl" />
              <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-white/15 bg-[#22191ad9] p-3 backdrop-blur">
                <div className="flex items-center justify-between text-xs text-white/70"><span>Analyse assistée</span><span className="text-[#ffd0c8]">Prête à démarrer</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full w-2/3 rounded-full bg-[#ffc1b6]" /></div>
              </div>
              <Link href="/app/try-on" className="absolute left-4 right-4 top-5 overflow-hidden rounded-2xl border border-[#ffd7e5]/45 bg-[#3a1829e8] p-3 shadow-xl transition hover:scale-[1.02]" aria-label={shop("tryOnCta")}>
                <div className="absolute -right-6 -top-8 size-24 rounded-full bg-[#ee9bbc]/35 blur-2xl" aria-hidden="true" />
                <div className="relative flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#ffd5e3] text-[#62223e]"><Eye className="size-5" aria-hidden="true" /></span>
                  <span className="min-w-0"><span className="block text-sm font-bold text-white">{shop("tryOnCta")}</span><span className="block text-xs text-white/65">Live · lèvres · teint · yeux</span></span>
                  <Sparkles className="ml-auto size-4 text-[#ffd3e1]" aria-hidden="true" />
                </div>
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
