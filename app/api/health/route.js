import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "vaelons-etsy-manager",
    global_pricing_mode: "price-independent-subset-batched-verified",
    batch_size: 25,
    write_verification: true,
    etsy_env_configured: Boolean(process.env.ETSY_API_KEY),
    etsy_session_fallback_supported: true,
    platform: process.env.RENDER ? "render" : (process.env.VERCEL ? "vercel" : "unknown"),
    commit: process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
  });
}
