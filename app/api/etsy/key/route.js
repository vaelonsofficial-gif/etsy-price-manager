import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.ETSY_API_KEY),
    mode: "server-only",
    user_input_required: false,
  });
}

export async function POST() {
  return NextResponse.json(
    { error: "Tarayıcıdan Etsy anahtarı kabul edilmiyor. Kimlik bilgisi yalnız sunucuda tutulur." },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Sunucu kimliği bu uçtan değiştirilemez." },
    { status: 405 }
  );
}
