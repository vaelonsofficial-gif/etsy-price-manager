import { NextResponse } from "next/server";
import { listDraftListings } from "../../../../lib/etsy";
import { readPluginAccess } from "../../../../lib/plugin-access";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = readPluginAccess(request, "vaelons:read");
    const data = await listDraftListings(auth.refresh_token);
    return NextResponse.json({
      ok: true,
      shop: data.shop,
      listings: data.listings,
      etsy_modified: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Plugin draft okuma başarısız.",
        etsy_modified: false,
      },
      { status: error?.status || 500 }
    );
  }
}
