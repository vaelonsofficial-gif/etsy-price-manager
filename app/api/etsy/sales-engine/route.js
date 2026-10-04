import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bridgeConfig() {
  const baseUrl = String(process.env.ETSY_BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(process.env.VAELONS_BRIDGE_TOKEN || "").trim();

  if (!baseUrl || !token) return null;

  return { baseUrl, token };
}

export async function POST(request) {
  try {
    const config = bridgeConfig();

    if (!config) {
      return NextResponse.json(
        { error: "Seller Bridge yapılandırılmadı." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${config.baseUrl}/ops/sales-engine/scan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`
        },
        body: JSON.stringify({
          listingLimit: Number(body?.listingLimit || 500),
          heroLimit: Number(body?.heroLimit || 25)
        }),
        cache: "no-store"
      }
    );

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Sales Engine başarısız (${response.status}).`,
          details: data?.details || data
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ...data,
      read_only: true,
      etsy_modified: false
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Sales Engine taraması başarısız."
      },
      { status: 500 }
    );
  }
}
