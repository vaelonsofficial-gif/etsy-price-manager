import { NextResponse } from "next/server";
import { sealPaperNexaSecret } from "../../../../lib/papernexa";

function normalizeCredentials(body) {
  const keystring = String(body?.keystring || "").trim();
  const sharedSecret = String(body?.sharedSecret || "").trim();
  const legacy = String(body?.apiKey || "").trim();

  if (keystring && sharedSecret) return `${keystring}:${sharedSecret}`;
  if (legacy.includes(":")) return legacy;

  const tokens = legacy
    .replace(/keystring/gi, " ")
    .replace(/shared[ _-]*secret/gi, " ")
    .replace(/[=:]/g, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (tokens.length >= 2) return `${tokens[0]}:${tokens[1]}`;
  return "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const clean = normalizeCredentials(body);

    if (!clean || !clean.includes(":")) {
      return NextResponse.json(
        {
          error: "Etsy Developer sayfasındaki Keystring ve Shared Secret değerlerinin ikisi de gerekli.",
          code: "PAPERNEXA_CREDENTIALS_INCOMPLETE",
        },
        { status: 400 }
      );
    }

    const [keystring, sharedSecret] = clean.split(":", 2);
    if (!keystring || !sharedSecret) {
      return NextResponse.json(
        {
          error: "Keystring veya Shared Secret eksik. İki değeri de Etsy Your Apps sayfasından kopyala.",
          code: "PAPERNEXA_CREDENTIALS_INVALID",
        },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true, configured: true });
    response.cookies.set("papernexa_api_key", sealPaperNexaSecret(`${keystring}:${sharedSecret}`), {
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
