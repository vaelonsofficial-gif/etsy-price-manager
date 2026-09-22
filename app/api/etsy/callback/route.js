import { NextResponse } from "next/server";
import { openPaperNexaSecret, sealPaperNexaSecret } from "../../../../lib/papernexa";

function normalizeShopPayload(payload) {
  if (payload?.shop_id) return payload;
  if (Array.isArray(payload?.results) && payload.results.length) return payload.results[0];
  if (Array.isArray(payload) && payload.length) return payload[0];
  return null;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const savedState = request.cookies.get("etsy_oauth_state")?.value;
    const codeVerifier = request.cookies.get("etsy_code_verifier")?.value;
    const profile = request.cookies.get("etsy_oauth_profile")?.value || "vaelons";

    if (!code) {
      return NextResponse.json({ error: "OAuth code bulunamadı." }, { status: 400 });
    }

    if (!state || !savedState || state !== savedState) {
      return NextResponse.json(
        { error: "OAuth state doğrulaması başarısız." },
        { status: 400 }
      );
    }

    if (!codeVerifier) {
      return NextResponse.json(
        { error: "PKCE code verifier bulunamadı." },
        { status: 400 }
      );
    }

    let apiKey;
    let expectedShopName;
    let redirectTarget;
    let refreshCookieName;
    let encryptRefresh = false;

    if (profile === "papernexa") {
      const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
      if (!encryptedKey) {
        return NextResponse.json({ error: "PaperNexa API anahtarı bulunamadı." }, { status: 400 });
      }
      apiKey = openPaperNexaSecret(encryptedKey);
      expectedShopName = "papernexa";
      redirectTarget = "https://etsy-price-manager.vercel.app/papernexa?etsy=connected";
      refreshCookieName = "papernexa_refresh_token";
      encryptRefresh = true;
    } else {
      apiKey = process.env.ETSY_API_KEY;
      expectedShopName = process.env.ETSY_EXPECTED_SHOP_NAME?.trim().toLowerCase();
      redirectTarget = "https://etsy-price-manager.vercel.app/?etsy=connected";
      refreshCookieName = "etsy_refresh_token";
    }

    const keystring = apiKey?.split(":")[0];
    if (!apiKey || !keystring) {
      return NextResponse.json({ error: "Etsy API anahtarı eksik." }, { status: 500 });
    }

    const redirectUri = "https://etsy-price-manager.vercel.app/api/etsy/callback";
    const tokenResponse = await fetch("https://api.etsy.com/v3/public/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: keystring,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }),
      cache: "no-store",
    });

    const data = await tokenResponse.json();
    if (!tokenResponse.ok || !data?.access_token || !data?.refresh_token) {
      return NextResponse.json(
        { error: "Etsy token alınamadı.", details: data },
        { status: tokenResponse.status || 400 }
      );
    }

    const userId = String(data.access_token).split(".")[0];
    const shopResponse = await fetch(
      `https://api.etsy.com/v3/application/users/${userId}/shops`,
      {
        headers: {
          "x-api-key": apiKey,
          Authorization: `Bearer ${data.access_token}`,
        },
        cache: "no-store",
      }
    );
    const shopPayload = await shopResponse.json();
    const shop = normalizeShopPayload(shopPayload);

    if (!shopResponse.ok) {
      return NextResponse.json(
        {
          error: "Etsy mağazası doğrulanamadı.",
          details: shopPayload,
          status: shopResponse.status,
        },
        { status: shopResponse.status }
      );
    }

    if (!shop?.shop_id) {
      return NextResponse.json(
        {
          error: "Yetkilendirilen Etsy hesabına ait mağaza doğrulanamadı.",
          shop_name: shop?.shop_name || null,
        },
        { status: 403 }
      );
    }

    if (
      expectedShopName &&
      String(shop.shop_name || "").trim().toLowerCase() !== expectedShopName
    ) {
      return NextResponse.json(
        {
          error: "Yetkilendirilen mağaza adı Manager ayarıyla eşleşmiyor.",
          expected_shop: expectedShopName,
          shop_name: shop.shop_name,
        },
        { status: 403 }
      );
    }

    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set(
      refreshCookieName,
      encryptRefresh ? sealPaperNexaSecret(data.refresh_token) : data.refresh_token,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 90 * 24 * 60 * 60,
        path: "/",
      }
    );

    response.cookies.set("etsy_oauth_state", "", { maxAge: 0, path: "/" });
    response.cookies.set("etsy_code_verifier", "", { maxAge: 0, path: "/" });
    response.cookies.set("etsy_oauth_profile", "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Etsy bağlantısı tamamlanamadı." },
      { status: 500 }
    );
  }
}
