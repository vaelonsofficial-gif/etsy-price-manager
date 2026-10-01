import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function challenge() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

async function probe(clientId, redirectUri) {
  const url = new URL("https://www.etsy.com/oauth/connect");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "listings_r listings_w");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("state", "diagnostic-state");
  url.searchParams.set("code_challenge", challenge());
  url.searchParams.set("code_challenge_method", "S256");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: controller.signal
    });
    clearTimeout(timer);
    const text = await response.text();
    return {
      redirect_uri: redirectUri,
      status: response.status,
      location: response.headers.get("location"),
      body_hint: text.slice(0, 220).replace(/\s+/g, " ")
    };
  } catch (error) {
    return {
      redirect_uri: redirectUri,
      error: error.name === "AbortError" ? "timeout" : error.message
    };
  }
}

export async function GET() {
  const apiKey = String(process.env.ETSY_API_KEY || "").trim();
  const clientId = apiKey.split(":")[0];
  if (!clientId) {
    return NextResponse.json({ ok: false, error: "missing_client_id" }, { status: 500 });
  }

  const candidates = [
    "https://etsy-price-manager.vercel.app/api/etsy/callback",
    "https://vaelons-etsy-price-manager.onrender.com/api/etsy/callback",
    "https://vaelons-etsy-seller-bridge.vercel.app/oauth/etsy/callback",
    "https://vaelons-etsy-seller-bridge-x2bh.vercel.app/oauth/etsy/callback",
    "https://papernexa-studio.bekirebru07.chatgpt.site/api/etsy?step=callback"
  ];

  const results = await Promise.all(candidates.map((uri) => probe(clientId, uri)));

  return NextResponse.json({
    ok: true,
    client_id_suffix: clientId.slice(-6),
    results
  });
}
