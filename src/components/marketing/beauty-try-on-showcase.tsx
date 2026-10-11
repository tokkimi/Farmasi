"use client";

import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function BeautyTryOnShowcase() {
  return (
    <section id="beauty-vr" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16">
      <div className="relative isolate min-h-[34rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#120d11] sm:min-h-[38rem]">
        <Image src="/beauty-vr-editorial.png" alt="Maquillage Beauty VR Try-On aux finitions fondues" fill priority sizes="(min-width: 1280px) 1280px, 100vw" className="object-cover object-[65%_center]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,8,9,.98)_0%,rgba(10,8,9,.84)_37%,rgba(10,8,9,.18)_66%,rgba(10,8,9,.04)_100%)]" />
        <div className="relative flex min-h-[34rem] max-w-xl flex-col justify-end p-7 sm:min-h-[38rem] sm:p-12">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[#f4b7cf]/35 bg-[#28111e]/75 px-3 py-1 text-xs font-medium tracking-[.14em] text-[#ffd8e6]"><Sparkles className="size-3" /> BEAUTY VR TRY-ON</p>
          <h2 className="mt-5 text-balance font-serif text-4xl leading-[.98] text-white sm:text-6xl">Essaye ton look.<br />Vois le fini.</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-white/72">Lèvres, teint et yeux : des couleurs posées en direct avec des contours doux, des textures réalistes et un rendu qui respecte chaque fini.</p>
          <Link href="/app/try-on" className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#f5b8ce] px-6 py-3 text-sm font-bold text-[#36101f] transition hover:brightness-105">Essayer le Beauty VR <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </section>
  );
}
