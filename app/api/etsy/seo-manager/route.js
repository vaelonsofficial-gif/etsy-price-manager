import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bridgeConfig() {
  const baseUrl = String(process.env.ETSY_BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(process.env.VAELONS_BRIDGE_TOKEN || "").trim();
  return baseUrl && token ? { baseUrl, token } : null;
}

async function bridge(path, options = {}) {
  const config = bridgeConfig();
  if (!config) return { response: null, data: { error: "Seller Bridge yapılandırılmadı." } };
  const response = await fetch(`${config.baseUrl}/ops/seo${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
      ...(options.headers || {})
    },
    cache: "no-store"
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

export async function GET(request) {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 100)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const { response, data } = await bridge(`/listings?state=active&limit=${limit}&offset=${offset}`);
  if (!response) return NextResponse.json(data, { status: 503 });
  return NextResponse.json({ ...data, read_only: true, etsy_modified: false }, { status: response.status });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (body.action === "prepare") {
    const listingId = String(body.listing_id || "").trim();
    if (!/^\\d+$/.test(listingId)) return NextResponse.json({ error: "Geçersiz listing ID.", etsy_modified: false }, { status: 400 });
    const { response, data } = await bridge(`/listings/${listingId}/prepare`, {
      method: "POST",
      body: JSON.stringify({
        proposed_title: body.proposed_title,
        proposed_tags: body.proposed_tags,
        proposed_description: body.proposed_description,
        reason: body.reason || "etsy_market_research_listing_specific"
      })
    });
    if (!response) return NextResponse.json(data, { status: 503 });
    return NextResponse.json({ ...data, publish_enabled: false, etsy_modified: false }, { status: response.status });
  }
  if (body.action !== "scan") {
    return NextResponse.json({ error: "Desteklenmeyen SEO işlemi.", etsy_modified: false }, { status: 400 });
  }
  const { response, data } = await bridge("/scan", {
    method: "POST",
    body: JSON.stringify({ state: "active", limit: Number(body.limit || 100), offset: Number(body.offset || 0) })
  });
  if (!response) return NextResponse.json(data, { status: 503 });
  return NextResponse.json({ ...data, read_only: true, publish_enabled: false, etsy_modified: false }, { status: response.status });
}
