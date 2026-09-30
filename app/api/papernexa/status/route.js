import { NextResponse } from "next/server";
import { openPaperNexaSecret, paperNexaSession } from "../../../../lib/papernexa";

export const dynamic = "force-dynamic";

function credentials(request) {
  const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
  const encryptedRefresh = request.cookies.get("papernexa_refresh_token")?.value;

  if (encryptedKey && encryptedRefresh) {
    return {
      source: "papernexa-dedicated",
      apiKey: openPaperNexaSecret(encryptedKey),
      refreshToken: openPaperNexaSecret(encryptedRefresh),
    };
  }

  const existingRefresh = request.cookies.get("etsy_refresh_token")?.value;
  const existingApiKey = process.env.ETSY_API_KEY;
  if (existingApiKey && existingRefresh) {
    return {
      source: "existing-verified-session",
      apiKey: existingApiKey,
      refreshToken: existingRefresh,
    };
  }

  return null;
}

export async function GET(request) {
  try {
    const creds = credentials(request);
    if (!creds) {
      return NextResponse.json({
        configured: false,
        connected: false,
        existing_connection_found: false,
        connection_source: null,
        error: "Bu tarayıcıda daha önce doğrulanmış Etsy oturumu bulunamadı.",
      });
    }

    // paperNexaSession refreshes the token and refuses any shop whose name is not PaperNexa.
    const { shop } = await paperNexaSession(creds.apiKey, creds.refreshToken);

    return NextResponse.json({
      configured: true,
      connected: true,
      existing_connection_found: true,
      connection_source: creds.source,
      shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      connected: false,
      existing_connection_found: true,
      connection_source: "existing-session-check",
      error: error.message,
      details: error.details || null,
    });
  }
}
