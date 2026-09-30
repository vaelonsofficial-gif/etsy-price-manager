import { NextResponse } from "next/server";
import { openPaperNexaSecret, paperNexaSession } from "../../../../lib/papernexa";

export const dynamic = "force-dynamic";

function credentials(request) {
  const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
  const encryptedRefresh = request.cookies.get("papernexa_refresh_token")?.value;

  if (encryptedRefresh) {
    return {
      source: encryptedKey ? "papernexa-dedicated" : "papernexa-server-key",
      apiKey: encryptedKey
        ? openPaperNexaSecret(encryptedKey)
        : process.env.ETSY_API_KEY,
      refreshToken: openPaperNexaSecret(encryptedRefresh),
    };
  }

  const existingApiKey = process.env.ETSY_API_KEY;
  const browserRefresh = request.cookies.get("etsy_refresh_token")?.value;
  if (existingApiKey && browserRefresh) {
    return {
      source: "existing-browser-session",
      apiKey: existingApiKey,
      refreshToken: browserRefresh,
    };
  }

  const persistentRefresh = process.env.ETSY_REFRESH_TOKEN;
  if (existingApiKey && persistentRefresh) {
    return {
      source: "existing-server-session",
      apiKey: existingApiKey,
      refreshToken: persistentRefresh,
    };
  }

  return null;
}

export async function GET(request) {
  const serverOauthReady = Boolean(process.env.ETSY_API_KEY);

  try {
    const creds = credentials(request);
    if (!creds?.apiKey || !creds?.refreshToken) {
      return NextResponse.json({
        configured: serverOauthReady,
        connected: false,
        existing_connection_found: false,
        reconnect_available: serverOauthReady,
        connection_source: serverOauthReady ? "server-oauth-ready" : null,
        error: serverOauthReady
          ? "PaperNexa için Etsy yetkilendirmesi gerekli."
          : "Etsy OAuth uygulama anahtarı sunucuda bulunamadı.",
      });
    }

    const { shop } = await paperNexaSession(creds.apiKey, creds.refreshToken);
    return NextResponse.json({
      configured: true,
      connected: true,
      existing_connection_found: true,
      reconnect_available: true,
      connection_source: creds.source,
      shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    });
  } catch (error) {
    return NextResponse.json({
      configured: serverOauthReady,
      connected: false,
      existing_connection_found: true,
      reconnect_available: serverOauthReady,
      connection_source: "existing-session-check",
      error: error.message,
      details: error.details || null,
    });
  }
}
