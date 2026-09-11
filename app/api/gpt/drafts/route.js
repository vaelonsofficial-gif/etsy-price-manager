import { NextResponse } from "next/server";
import { readGptRefreshToken } from "../../../../lib/gpt-action-token";
import { listDraftListings } from "../../../../lib/etsy";

export async function GET(request) {
  try {
    const refreshToken = readGptRefreshToken(request);
    const data = await listDraftListings(refreshToken);
    return NextResponse.json({
      ok: true,
      shop: data.shop,
      count: data.listings.length,
      drafts: data.listings,
      timezone: "Europe/Istanbul",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Taslaklar alınamadı.",
        details: error.details || null,
      },
      { status: error.status || 500 }
    );
  }
}
