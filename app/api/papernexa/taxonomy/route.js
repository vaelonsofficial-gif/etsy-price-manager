import { NextResponse } from "next/server";
import { openPaperNexaSecret, searchSellerTaxonomy } from "../../../../lib/papernexa";

export const dynamic = "force-dynamic";

function resolveApiKey(request) {
  const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
  if (encryptedKey) return openPaperNexaSecret(encryptedKey);
  return process.env.ETSY_API_KEY || null;
}

export async function GET(request) {
  try {
    const apiKey = resolveApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: "Etsy API bağlantısı bulunamadı." }, { status: 401 });
    }
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const results = await searchSellerTaxonomy(apiKey, q);
    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Kategoriler alınamadı.", details: error.details || null },
      { status: error.status || 500 }
    );
  }
}
