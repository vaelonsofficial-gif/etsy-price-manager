import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getVaelonsCost } from "../../../../lib/vaelons-cost-catalog";
import {
  scanGlobalVariations,
  previewGlobalVariationPrice,
  applyGlobalVariationPrice
} from "../../../../lib/etsy";

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
  if (!config) throw new Error("Seller Bridge yapılandırılmadı.");

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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
    const error = new Error(data?.error || `Seller Bridge isteği başarısız (${response.status}).`);
    error.status = response.status;
    error.details = data?.details || data;
    throw error;
  }

  return data;
}

async function auth() {
  const store = await cookies();
  const refreshToken = store.get("etsy_refresh_token")?.value;
  if (!refreshToken) {
    const e = new Error("Etsy bağlantısı gerekli.");
    e.status = 401;
    throw e;
  }
  return { refreshToken };
}

export async function GET() {
  try {
    if (bridgeConfig()) {
      const data = await bridgeFetch("/ops/render-price-manager/variations");
      return NextResponse.json({
        ok: true,
        shop: { shop_name: "VAELONS" },
        reference_listing: data?.referenceListing
          ? {
              listing_id: data.referenceListing.listingId,
              title: data.referenceListing.title
            }
          : null,
        active_listing_count: Number(data?.activeListingCount || 0),
        variations: (data?.variations || []).map((item) => ({
          key: item.key,
          label: item.label,
          reference_product_id: item.referenceProductId,
          current_price:
            Number.isFinite(Number(item.currentPrice))
              ? Number(item.currentPrice)
              : null
        })),
        connection_mode: "seller-bridge"
      });
    }

    const { refreshToken } = await auth();
    return NextResponse.json({
      ok: true,
      ...(await scanGlobalVariations(refreshToken))
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message, details: e.details || null },
      { status: e.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (bridgeConfig()) {
      if (body?.preview === true) {
        const data = await bridgeFetch(
          "/ops/render-price-manager/preview",
          {
            method: "POST",
            body: JSON.stringify({
              variationKey: body.variationKey
            })
          }
        );

        return NextResponse.json({
          ok: true,
          preview: true,
          variation_key: body.variationKey,
          active_listings_scanned: Number(data?.activeScanned || 0),
          matched_listing_count: Number(data?.matchedCount || 0),
          matched: (data?.matched || []).map((item) => ({
            listing_id: item.listingId,
            title: item.title,
            products_matched: item.productsMatched
          })),
          connection_mode: "seller-bridge"
        });
      }

      if (body?.confirm !== true) {
        return NextResponse.json(
          { error: "Önizleme veya confirm=true gerekli." },
          { status: 400 }
        );
      }

      if (body?.pricingSafety) {
        const safety = body.pricingSafety || {};
        const cost = getVaelonsCost({
          variationKey: body.variationKey,
          label: safety.label
        });
        const nextPrice = Number(body.price);
        const currentPrice = Number(safety.currentPrice);
        const minMargin = Number(safety.minMarginPct) / 100;
        const netRatio = Number(safety.etsyNetRatio);
        const maxStep = Math.abs(Number(safety.maxStepPct)) / 100;

        if (!cost.found || !(cost.cost_usd > 0)) {
          return NextResponse.json(
            { error: "Maliyet güvenlik kuralı bulunamadı." },
            { status: 400 }
          );
        }

        if (!(netRatio > minMargin && minMargin >= 0)) {
          return NextResponse.json(
            { error: "Kâr marjı / Etsy net oranı ayarı geçersiz." },
            { status: 400 }
          );
        }

        const minimumProfitFloor = cost.cost_usd / (netRatio - minMargin);

        if (!(nextPrice >= minimumProfitFloor - 0.01)) {
          return NextResponse.json(
            {
              error: `Bu fiyat minimum kâr sınırının altında. Alt sınır: ${minimumProfitFloor.toFixed(2)}`,
              minimum_profit_floor: minimumProfitFloor
            },
            { status: 400 }
          );
        }

        if (
          currentPrice > 0 &&
          maxStep > 0 &&
          currentPrice >= minimumProfitFloor
        ) {
          const changePct = Math.abs(nextPrice - currentPrice) / currentPrice;
          if (changePct > maxStep + 0.0001) {
            return NextResponse.json(
              {
                error: `Tek seferlik değişim %${(changePct * 100).toFixed(2)}. İzin verilen maksimum adım %${(maxStep * 100).toFixed(2)}.`
              },
              { status: 400 }
            );
          }
        }
      }

      const data = await bridgeFetch(
        "/ops/render-price-manager/apply",
        {
          method: "POST",
          body: JSON.stringify({
            variationKey: body.variationKey,
            price: body.price,
            listingIds: body.listingIds,
            approval: "ONAYLIYORUM"
          })
        }
      );

      return NextResponse.json({
        ok: true,
        variation_key: body.variationKey,
        new_price: Number(body.price),
        requested_listing_count: Number(data?.requestedCount || 0),
        listings_changed: Number(data?.changedCount || 0),
        listings_verified: Number(data?.verifiedCount || 0),
        error_count: Number(data?.errorCount || 0),
        changed: (data?.results || []).filter((item) => item.status === "UPDATED"),
        results: data?.results || [],
        connection_mode: "seller-bridge"
      });
    }

    const { refreshToken } = await auth();

    if (body?.preview === true) {
      return NextResponse.json(
        await previewGlobalVariationPrice({
          variationKey: body.variationKey,
          refreshToken
        })
      );
    }

    if (body?.confirm !== true) {
      return NextResponse.json(
        { error: "Önizleme veya confirm=true gerekli." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      await applyGlobalVariationPrice({
        variationKey: body.variationKey,
        price: body.price,
        refreshToken,
        listingIds: body.listingIds
      })
    );
  } catch (e) {
    return NextResponse.json(
      { error: e.message, details: e.details || null },
      { status: e.status || 500 }
    );
  }
}
