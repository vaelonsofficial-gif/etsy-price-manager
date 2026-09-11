import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const savedState = request.cookies.get("etsy_oauth_state")?.value;
    const codeVerifier = request.cookies.get("etsy_code_verifier")?.value;

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

    const apiKey = process.env.ETSY_API_KEY;
    const keystring = apiKey?.split(":")[0];
    if (!apiKey || !keystring) {
      return NextResponse.json({ error: "ETSY_API_KEY eksik." }, { status: 500 });
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
    const shop = await shopResponse.json();

    if (!shopResponse.ok) {
      return NextResponse.json(
        {
          error: "Etsy mağazası doğrulanamadı.",
          details: shop,
          status: shopResponse.status,
        },
        { status: shopResponse.status }
      );
    }

    if (!shop?.shop_id || String(shop?.user_id) !== String(userId)) {
      return NextResponse.json(
        {
          error: "Yetkilendirilen Etsy hesabına ait mağaza doğrulanamadı.",
          shop_name: shop?.shop_name || null,
        },
        { status: 403 }
      );
    }

    const expectedShopName = process.env.ETSY_EXPECTED_SHOP_NAME?.trim().toLowerCase();
    if (
      expectedShopName &&
      String(shop.shop_name || "").trim().toLowerCase() !== expectedShopName
    ) {
      return NextResponse.json(
        {
          error: "Yetkilendirilen mağaza adı Manager ayarıyla eşleşmiyor.",
          shop_name: shop.shop_name,
        },
        { status: 403 }
      );
    }

    const response = NextResponse.redirect(
      "https://etsy-price-manager.vercel.app/?etsy=connected"
    );
    response.cookies.set("etsy_refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.set("etsy_oauth_state", "", { maxAge: 0, path: "/" });
    response.cookies.set("etsy_code_verifier", "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Etsy bağlantısı tamamlanamadı." },
      { status: 500 }
    );
  }
}
