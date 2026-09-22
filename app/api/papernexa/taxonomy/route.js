import { NextResponse } from "next/server";
import { openPaperNexaSecret, searchSellerTaxonomy } from "../../../../lib/papernexa";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
    if (!encryptedKey) {
      return NextResponse.json({ error: "Önce PaperNexa API anahtarını kaydet." }, { status: 401 });
    }
    const apiKey = openPaperNexaSecret(encryptedKey);
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
