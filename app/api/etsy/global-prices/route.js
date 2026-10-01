import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { scanGlobalVariations, previewGlobalVariationPrice, applyGlobalVariationPrice } from "../../../../lib/etsy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function token() {
  const store = await cookies();
  const value = store.get("etsy_refresh_token")?.value;
  if (!value) { const e = new Error("Etsy bağlantısı gerekli."); e.status = 401; throw e; }
  return value;
}

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...(await scanGlobalVariations(await token())) });
  } catch (e) {
    return NextResponse.json({ error: e.message, details: e.details || null }, { status: e.status || 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body?.preview === true) return NextResponse.json(await previewGlobalVariationPrice({ variationKey: body.variationKey, refreshToken: await token() }));
    if (body?.confirm !== true) return NextResponse.json({ error: "Önizleme veya confirm=true gerekli." }, { status: 400 });
    return NextResponse.json(await applyGlobalVariationPrice({ variationKey: body.variationKey, price: body.price, refreshToken: await token() }));
  } catch (e) {
    return NextResponse.json({ error: e.message, details: e.details || null }, { status: e.status || 500 });
  }
}
