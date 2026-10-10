import { NextResponse } from "next/server";

/**
 * Disabled on the Farmasi site: this importer pulled Haru's partner-brand
 * catalogues. The Farmasi catalogue is seeded from farmasi-catalog.ts via
 * /api/setup/seed-products instead.
 */
export async function GET() {
  return NextResponse.json({ ok: true, done: true, disabled: true, sources: 0 });
}
