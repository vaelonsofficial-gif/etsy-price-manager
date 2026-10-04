import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const baseUrl = "https://vaelons-etsy-seller-bridge-3dql-qn8qjy3vp.vercel.app";
  const token = String(process.env.VAELONS_BRIDGE_TOKEN || "").trim();

  if (!baseUrl || !token) {
    return NextResponse.json(
      { ok: false, error: "bridge_not_configured" },
      { status: 503 }
    );
  }

  const response = await fetch(
    `${baseUrl}/ops/sales-engine/scan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        listingLimit: 500,
        heroLimit: 25
      }),
      cache: "no-store"
    }
  );

  const data = await response.json().catch(() => null);

  return NextResponse.json(
    {
      ok: response.ok,
      status: response.status,
      engine: data?.engine || null,
      coverage: data?.coverage || null,
      action_counts: data?.action_counts || null,
      hero_count: data?.hero_count || 0,
      hero_sample: Array.isArray(data?.hero_candidates)
        ? data.hero_candidates.slice(0, 5)
        : [],
      data_limits: data?.data_limits || null
    },
    { status: response.ok ? 200 : response.status }
  );
}
