import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/marketing/hero";
import { ScanShowcase } from "@/components/marketing/scan-showcase";
import { BeautyTryOnShowcase } from "@/components/marketing/beauty-try-on-showcase";
import { FarmasiDemoGate } from "@/components/farmasi-demo-gate";

export const metadata: Metadata = { title: "Farmasi | Skin Scanner & Beauty VR" };

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FarmasiDemoGate><div className="farmasi-public flex min-h-screen flex-col"><SiteHeader /><main id="main-content" className="flex-1"><Hero /><BeautyTryOnShowcase /><ScanShowcase /></main></div></FarmasiDemoGate>;
}
