"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Droplets, ListChecks, ScanFace, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

const CHECK_ICONS = [Camera, ListChecks, Droplets, Sparkles];

export function ScanShowcase() {
  const t = useTranslations("scanShowcase");
  const faceScan = useTranslations("faceScanPage");
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
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/app/face-scan" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-[#20191a] transition hover:bg-[#fff4f1]">
                  <ScanFace className="size-5" aria-hidden="true" />
                  {faceScan("title")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/app/scan" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 text-base font-medium text-white transition hover:bg-white/10">
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
