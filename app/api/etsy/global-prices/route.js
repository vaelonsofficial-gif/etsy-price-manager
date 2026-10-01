import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { scanGlobalVariations, previewGlobalVariationPrice, applyGlobalVariationPrice } from "../../../../lib/etsy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function auth() {
  const store = await cookies();
  const refreshToken = store.get("etsy_refresh_token")?.value;
  const apiKey = store.get("etsy_api_key")?.value;
  if (!refreshToken) { const e = new Error("Etsy bağlantısı gerekli."); e.status = 401; throw e; }
  return { refreshToken, apiKey };
}

export async function GET() {
  try {
    const { refreshToken, apiKey } = await auth();
    return NextResponse.json({ ok: true, ...(await scanGlobalVariations(refreshToken, apiKey)) });
  } catch (e) {
    return NextResponse.json({ error: e.message, details: e.details || null }, { status: e.status || 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { refreshToken, apiKey } = await auth();
    if (body?.preview === true) return NextResponse.json(await previewGlobalVariationPrice({ variationKey: body.variationKey, refreshToken, apiKey }));
    if (body?.confirm !== true) return NextResponse.json({ error: "Önizleme veya confirm=true gerekli." }, { status: 400 });
    return NextResponse.json(await applyGlobalVariationPrice({ variationKey: body.variationKey, price: body.price, refreshToken, apiKey }));
  } catch (e) {
    return NextResponse.json({ error: e.message, details: e.details || null }, { status: e.status || 500 });
  }
}
