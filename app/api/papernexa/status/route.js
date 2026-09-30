import { NextResponse } from "next/server";
import { openPaperNexaSecret, paperNexaSession } from "../../../../lib/papernexa";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
  const encryptedRefresh = request.cookies.get("papernexa_refresh_token")?.value;
  const configured = Boolean(encryptedKey);

  if (!encryptedKey) {
    return NextResponse.json({
      configured: false,
      connected: false,
      connection_source: null,
      error: "PaperNexa Etsy Developer API anahtarı bu tarayıcıda kayıtlı değil.",
    });
  }

  if (!encryptedRefresh) {
    return NextResponse.json({
      configured: true,
      connected: false,
      connection_source: "papernexa-dedicated",
      error: "PaperNexa API anahtarı kayıtlı; Etsy hesabı yeniden yetkilendirilmeli.",
    });
  }

  try {
    const apiKey = openPaperNexaSecret(encryptedKey);
    const refreshToken = openPaperNexaSecret(encryptedRefresh);
    const { shop } = await paperNexaSession(apiKey, refreshToken);

    return NextResponse.json({
      configured: true,
      connected: true,
      connection_source: "papernexa-dedicated",
      shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    });
  } catch (error) {
    return NextResponse.json({
      configured,
      connected: false,
      connection_source: "papernexa-dedicated",
      error: error.message,
      details: error.details || null,
    });
  }
}
