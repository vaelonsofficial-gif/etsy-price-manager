import { NextResponse } from "next/server";
import { sealPaperNexaSecret } from "../../../../lib/papernexa";

export async function POST(request) {
  try {
    const { apiKey } = await request.json();
    const clean = String(apiKey || "").trim();
    if (!clean || !clean.includes(":")) {
      return NextResponse.json(
        { error: "PaperNexa Etsy API key 'keystring:shared_secret' formatında olmalı." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("papernexa_api_key", sealPaperNexaSecret(clean), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "PaperNexa API anahtarı kaydedilemedi." },
      { status: 500 }
    );
  }
}
