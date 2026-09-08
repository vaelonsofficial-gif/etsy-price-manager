import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const url = new URL(request.url);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const savedState = request.cookies.get("etsy_oauth_state")?.value;
    const codeVerifier =
      request.cookies.get("etsy_code_verifier")?.value;

    if (!code) {
      return NextResponse.json(
        { error: "OAuth code bulunamadı." },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "ETSY_API_KEY eksik." },
        { status: 500 }
      );
    }

    const redirectUri =
      "https://etsy-price-manager.vercel.app/api/etsy/callback";

    const tokenResponse = await fetch(
      "https://api.etsy.com/v3/public/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-api-key": apiKey,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: keystring,
          redirect_uri: redirectUri,
          code,
          code_verifier: codeVerifier,
        }),
      }
    );

    const data = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          error: "Etsy token alınamadı.",
          details: data,
        },
        { status: tokenResponse.status }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Etsy bağlantısı başarılı. Access token oluşturuldu.",
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}
