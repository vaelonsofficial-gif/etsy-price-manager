import { NextResponse } from "next/server";
import { readGptRefreshToken } from "../../../../lib/gpt-action-token";
import { getListingPriceInventory, updateSelectedListingPrices } from "../../../../lib/etsy";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const refreshToken = readGptRefreshToken(request);
    const listingId = new URL(request.url).searchParams.get("listingId");
    if (!listingId) return NextResponse.json({ error: "listingId gerekli." }, { status: 400 });
    const data = await getListingPriceInventory({ listingId, refreshToken });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json({ error: error.message, details: error.details || null }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  try {
    const refreshToken = readGptRefreshToken(request);
    const body = await request.json();
    if (body?.confirm !== true) return NextResponse.json({ error: "Fiyat değişikliği için confirm=true gerekli." }, { status: 400 });
    const result = await updateSelectedListingPrices({ listingId: body.listingId, updates: body.updates, refreshToken });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message, details: error.details || null }, { status: error.status || 500 });
  }
}