"use client";
import { ScanFace, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return <header className={`${overlay ? "fixed inset-x-0" : "sticky"} farmasi-site-header top-0 z-40`}><div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8"><Link href="/" className="shrink-0"><Logo className="h-8 w-auto sm:h-10" /></Link><nav aria-label="Navigation Farmasi" className="hidden items-center gap-6 text-sm font-semibold lg:flex"><Link href="/app/face-scan" className="inline-flex items-center gap-2"><ScanFace className="size-4" />Skin Scanner</Link><Link href="/app/try-on" className="inline-flex items-center gap-2"><Sparkles className="size-4" />Beauty VR</Link></nav><LocaleSwitcher compact /></div></header>;
}
