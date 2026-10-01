import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getListingPriceInventory, updateSelectedListingPrices } from "../../../../lib/etsy";

export const dynamic = "force-dynamic";

async function auth() {
  const store = await cookies();
  const refreshToken = store.get("etsy_refresh_token")?.value;
  const apiKey = store.get("etsy_api_key")?.value;
  if (!refreshToken) { const e = new Error("Etsy bağlantısı gerekli."); e.status = 401; throw e; }
  return { refreshToken, apiKey };
}
export async function GET(request) {
  try {
    const listingId = new URL(request.url).searchParams.get("listingId");
    if (!listingId) return NextResponse.json({ error: "listingId gerekli." }, { status: 400 });
    const { refreshToken, apiKey } = await auth();
    return NextResponse.json({ ok: true, ...(await getListingPriceInventory({ listingId, refreshToken, apiKey })) });
  } catch (e) { return NextResponse.json({ error:e.message, details:e.details||null }, { status:e.status||500 }); }
}
export async function POST(request) {
  try {
    const body=await request.json();
    if (body?.confirm !== true) return NextResponse.json({ error:"confirm=true gerekli." },{status:400});
    const { refreshToken, apiKey } = await auth();
    return NextResponse.json(await updateSelectedListingPrices({ listingId:body.listingId, updates:body.updates, refreshToken, apiKey }));
  } catch(e){ return NextResponse.json({error:e.message,details:e.details||null},{status:e.status||500}); }
}