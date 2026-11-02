import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { FarmasiHome } from "@/components/farmasi-home";
import { FarmasiDemoGate } from "@/components/farmasi-demo-gate";

export const metadata: Metadata = { title: "Farmasi | Skin Scanner & Beauty VR" };

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FarmasiDemoGate><div className="farmasi-public flex min-h-screen flex-col"><SiteHeader /><main id="main-content" className="flex-1"><FarmasiHome /></main></div></FarmasiDemoGate>;
}
