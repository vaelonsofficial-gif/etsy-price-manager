import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "vaelons-etsy-manager",
    global_pricing_mode: "price-independent-subset-batched-verified",
    batch_size: 25,
    write_verification: true,
  canonical_host: "etsy-price-manager.vercel.app",
    etsy_env_configured: Boolean(process.env.ETSY_API_KEY),
    credential_mode: "server-only",
    user_key_input_required: false,
    etsy_session_fallback_supported: false,
    platform: process.env.RENDER ? "render" : (process.env.VERCEL ? "vercel" : "unknown"),
    commit: process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
  });
}
