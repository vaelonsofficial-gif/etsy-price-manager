import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function validApiKey(value) {
  const text = String(value || "").trim();
  const separator = text.indexOf(":");
  return text.length >= 20 && text.length <= 256 && separator > 0 && separator < text.length - 1;
}

export async function GET() {
  const store = await cookies();
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.ETSY_API_KEY || store.get("etsy_api_key")?.value),
  });
}

export async function POST(request) {
  const body = await request.json();
  const value = String(body?.apiKey || "").trim();
  if (!validApiKey(value)) {
    return NextResponse.json(
      { error: "Etsy API anahtarı keystring:shared_secret biçiminde olmalı." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true, configured: true });
  response.cookies.set("etsy_api_key", value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 90 * 24 * 60 * 60,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, configured: Boolean(process.env.ETSY_API_KEY) });
  response.cookies.set("etsy_api_key", "", { maxAge: 0, path: "/" });
  return response;
}
