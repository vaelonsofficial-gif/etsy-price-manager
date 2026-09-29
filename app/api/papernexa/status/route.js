import { NextResponse } from "next/server";
import { openPaperNexaSecret, paperNexaSession } from "../../../../lib/papernexa";

export const dynamic = "force-dynamic";

function credentials(request) {
  const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
  const encryptedRefresh = request.cookies.get("papernexa_refresh_token")?.value;

  if (encryptedRefresh) {
    return {
      source: encryptedKey ? "papernexa" : "papernexa-server-key",
      apiKey: encryptedKey
        ? openPaperNexaSecret(encryptedKey)
        : process.env.ETSY_API_KEY,
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
    if (!creds?.apiKey || !creds?.refreshToken) {
      return NextResponse.json({
        connected: false,
        existing_connection_found: false,
        reconnect_available: Boolean(process.env.ETSY_API_KEY),
        error: "Bu tarayıcıda PaperNexa Etsy oturumu bulunamadı.",
      });
    }

    const { shop } = await paperNexaSession(creds.apiKey, creds.refreshToken);
    return NextResponse.json({
      connected: true,
      existing_connection_found: true,
      reconnect_available: true,
      connection_source: creds.source,
      shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      existing_connection_found: true,
      reconnect_available: Boolean(process.env.ETSY_API_KEY),
      error: error.message,
      details: error.details || null,
    });
  }
}
