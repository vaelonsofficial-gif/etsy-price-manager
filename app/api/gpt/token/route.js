import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createGptActionToken } from "../../../../lib/gpt-action-token";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("etsy_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Önce VAELONS Etsy hesabını Manager'a bağla." },
        { status: 401 }
      );
    }

    const apiKey = createGptActionToken(refreshToken);
    return NextResponse.json({
      ok: true,
      apiKey,
      schemaUrl: "https://etsy-price-manager.vercel.app/api/gpt/openapi",
      authType: "bearer",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "GPT Action anahtarı üretilemedi." },
      { status: error.status || 500 }
    );
  }
}
