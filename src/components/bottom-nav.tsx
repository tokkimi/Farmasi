"use client";
import { ScanFace, Sparkles } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
export function BottomNav() {
  const pathname = usePathname();
  if (!pathname.startsWith("/app")) return null;
  const tabs = [{ href: "/app/face-scan", label: "Skin Scanner", icon: ScanFace }, { href: "/app/try-on", label: "Beauty VR", icon: Sparkles }];
  return <nav aria-label="Navigation Farmasi" className="farmasi-bottom-nav fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xs rounded-[26px]"><div className="flex items-center p-2 pb-[max(.5rem,env(safe-area-inset-bottom))]">{tabs.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[10px] font-semibold ${pathname.startsWith(href) ? "farmasi-tab-active" : ""}`}><Icon className="size-5" /><span>{label}</span></Link>)}</div></nav>;
}
