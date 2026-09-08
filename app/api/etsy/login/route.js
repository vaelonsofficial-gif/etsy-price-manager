import crypto from "crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const keystring = process.env.ETSY_API_KEY?.split(":")[0];
  const redirectUri =
    "https://etsy-price-manager.vercel.app/api/etsy/callback";

  if (!keystring) {
    return NextResponse.json(
      { error: "ETSY_API_KEY eksik" },
      { status: 500 }
    );
  }

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
  url.searchParams.set("client_id", keystring);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(url);

  response.cookies.set("etsy_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  response.cookies.set("etsy_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
