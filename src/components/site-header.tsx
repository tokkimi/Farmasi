"use client";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return <header className={`${overlay ? "fixed inset-x-0" : "sticky"} farmasi-site-header top-0 z-40`}><div className="mx-auto flex h-20 max-w-7xl items-center justify-center px-5 sm:px-8"><Link href="/" aria-label="Farmasi" className="shrink-0"><Logo className="h-8 w-auto sm:h-10" /></Link></div></header>;
}
