import { NextResponse } from "next/server";
import { getVaelonsCost } from "../../../../lib/vaelons-cost-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bridgeConfig() {
  const baseUrl = String(process.env.ETSY_BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(process.env.VAELONS_BRIDGE_TOKEN || "").trim();
  if (!baseUrl || !token) return null;
  return { baseUrl, token };
}

async function bridgeFetch(path, options = {}) {
  const config = bridgeConfig();
  if (!config) {
    const error = new Error("Seller Bridge yapılandırılmadı.");
    error.status = 503;
    throw error;
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${config.token}`
    },
    cache: "no-store"
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(
      data?.error || `Seller Bridge market analysis failed (${response.status}).`
    );
    error.status = response.status;
    error.details = data?.details || data;
    throw error;
  }

  return data;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const variationKey = String(body?.variationKey || "").trim();
    const label = String(body?.label || "").trim();
    const currentPrice = Number(body?.currentPrice);

    if (!variationKey) {
      return NextResponse.json(
        { error: "variationKey gerekli." },
        { status: 400 }
      );
    }

    if (!(currentPrice > 0)) {
      return NextResponse.json(
        { error: "Mevcut fiyat bulunamadı." },
        { status: 400 }
      );
    }

    const catalogCost = getVaelonsCost({ variationKey, label });
    const overrideCost = Number(body?.costUsd);
    const costUsd =
      overrideCost > 0
        ? overrideCost
        : catalogCost.cost_usd;

    if (!(costUsd > 0)) {
      return NextResponse.json(
        {
          error: "Bu varyasyon için maliyet bulunamadı.",
          cost: catalogCost
        },
        { status: 400 }
      );
    }

    const analysis = await bridgeFetch(
      "/ops/market-price-manager/analyze",
      {
        method: "POST",
        body: JSON.stringify({
          variationKey,
          label,
          currentPrice,
          costUsd,
          minMarginPct:
            Number.isFinite(Number(body?.minMarginPct))
              ? Number(body.minMarginPct)
              : 20,
          marketAdjustmentPct:
            Number.isFinite(Number(body?.marketAdjustmentPct))
              ? Number(body.marketAdjustmentPct)
              : 0,
          maxStepPct:
            Number.isFinite(Number(body?.maxStepPct))
              ? Number(body.maxStepPct)
              : 5,
          etsyNetRatio:
            Number.isFinite(Number(body?.etsyNetRatio))
              ? Number(body.etsyNetRatio)
              : 200 / 249,
          buyerCountry:
            String(body?.buyerCountry || "US").toUpperCase(),
          minReferences:
            Number.isFinite(Number(body?.minReferences))
              ? Number(body.minReferences)
              : 10,
          searchLimit:
            Number.isFinite(Number(body?.searchLimit))
              ? Number(body.searchLimit)
              : 180
        })
      }
    );

    return NextResponse.json({
      ...analysis,
      cost: {
        ...catalogCost,
        cost_usd: costUsd,
        overridden: overrideCost > 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Piyasa fiyat analizi başarısız.",
        details: error.details || null
      },
      { status: error.status || 500 }
    );
  }
}
