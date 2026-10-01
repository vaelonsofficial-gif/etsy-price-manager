import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "vaelons-etsy-manager",
    global_pricing_mode: "price-independent-subset-batched",
    batch_size: 25,
    etsy_env_configured: Boolean(process.env.ETSY_API_KEY),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
  });
}
