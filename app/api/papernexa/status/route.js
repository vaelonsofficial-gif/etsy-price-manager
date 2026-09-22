import { NextResponse } from "next/server";
import { openPaperNexaSecret, paperNexaSession } from "../../../../lib/papernexa";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
    const encryptedRefresh = request.cookies.get("papernexa_refresh_token")?.value;
    if (!encryptedKey) {
      return NextResponse.json({ configured: false, connected: false });
    }
    if (!encryptedRefresh) {
      return NextResponse.json({ configured: true, connected: false });
    }

    const apiKey = openPaperNexaSecret(encryptedKey);
    const refreshToken = openPaperNexaSecret(encryptedRefresh);
    const { shop } = await paperNexaSession(apiKey, refreshToken);
    return NextResponse.json({
      configured: true,
      connected: true,
      shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      connected: false,
      error: error.message,
      details: error.details || null,
    });
  }
}
