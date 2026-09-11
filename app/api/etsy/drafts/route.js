import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listDraftListings } from "../../../../lib/etsy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("etsy_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { connected: false, error: "Etsy bağlantısı gerekli." },
        { status: 401 }
      );
    }

    const data = await listDraftListings(refreshToken);
    return NextResponse.json({ connected: true, ...data });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error.message,
        details: error.details || null,
      },
      { status: error.status || 500 }
    );
  }
}
