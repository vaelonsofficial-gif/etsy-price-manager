import { NextResponse } from "next/server";
import { getVaelonsCost } from "../../../lib/vaelons-cost-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const baseUrl = String(process.env.ETSY_BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(process.env.VAELONS_BRIDGE_TOKEN || "").trim();

  if (!baseUrl || !token) {
    return NextResponse.json({ ok: false, error: "bridge_not_configured" }, { status: 503 });
  }

  const variationKey = "70x100cm::canvas black frame";
  const label = "Framing: Canvas Black Frame · Size: 70x100 cm (28\" x 40\")";
  const cost = getVaelonsCost({ variationKey, label });

  const response = await fetch(`${baseUrl}/ops/market-price-manager/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      variationKey,
      label,
      currentPrice: 304.41,
      costUsd: cost.cost_usd,
      minMarginPct: 20,
      marketAdjustmentPct: 0,
      maxStepPct: 5,
      etsyNetRatio: 200 / 249,
      buyerCountry: "US",
      minReferences: 10,
      searchLimit: 180
    }),
    cache: "no-store"
  });

  const data = await response.json().catch(() => null);

  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    market: data?.market || null,
    recommendation: data?.recommendation || null,
    target: data?.target || null
  }, { status: response.ok ? 200 : response.status });
}
