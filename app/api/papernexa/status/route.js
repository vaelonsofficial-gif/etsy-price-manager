import { NextResponse } from "next/server";
import { openPaperNexaSecret, paperNexaSession } from "../../../../lib/papernexa";

export const dynamic = "force-dynamic";

function credentials(request) {
  const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
  const encryptedRefresh = request.cookies.get("papernexa_refresh_token")?.value;

  if (encryptedKey && encryptedRefresh) {
    return {
      source: "papernexa",
      apiKey: openPaperNexaSecret(encryptedKey),
      refreshToken: openPaperNexaSecret(encryptedRefresh),
    };
  }

  const legacyRefresh = request.cookies.get("etsy_refresh_token")?.value;
  const legacyApiKey = process.env.ETSY_API_KEY;
  if (legacyApiKey && legacyRefresh) {
    return {
      source: "existing",
      apiKey: legacyApiKey,
      refreshToken: legacyRefresh,
    };
  }

  return null;
}

export async function GET(request) {
  try {
    const creds = credentials(request);
    if (!creds) {
      return NextResponse.json({
        connected: false,
        existing_connection_found: false,
        error: "Bu tarayıcıda mevcut Etsy oturumu bulunamadı.",
      });
    }

    const { shop } = await paperNexaSession(creds.apiKey, creds.refreshToken);
    return NextResponse.json({
      connected: true,
      existing_connection_found: true,
      connection_source: creds.source,
      shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      existing_connection_found: true,
      error: error.message,
      details: error.details || null,
    });
  }
}
