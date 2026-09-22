import crypto from "crypto";
import { NextResponse } from "next/server";
import { openPaperNexaSecret, keystring } from "../../../../lib/papernexa";

export async function GET(request) {
  try {
    const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
    if (!encryptedKey) {
      return NextResponse.redirect("https://etsy-price-manager.vercel.app/papernexa?setup=required");
    }
    const apiKey = openPaperNexaSecret(encryptedKey);
    const clientId = keystring(apiKey);
    const redirectUri = "https://etsy-price-manager.vercel.app/api/etsy/callback";

    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    const state = crypto.randomBytes(16).toString("hex");

    const url = new URL("https://www.etsy.com/oauth/connect");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "listings_r listings_w");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(url);
    const common = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    };
    response.cookies.set("etsy_code_verifier", codeVerifier, common);
    response.cookies.set("etsy_oauth_state", state, common);
    response.cookies.set("etsy_oauth_profile", "papernexa", common);
    return response;
  } catch {
    return NextResponse.redirect("https://etsy-price-manager.vercel.app/papernexa?setup=invalid");
  }
}
