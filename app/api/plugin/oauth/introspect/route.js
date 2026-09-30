import { NextResponse } from "next/server";
import {
  PLUGIN_OAUTH_ISSUER,
  openPluginToken,
  readBearer,
} from "../../../../../lib/plugin-oauth";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let token = readBearer(request);
    if (!token && contentType.includes("application/x-www-form-urlencoded")) {
      const form = new URLSearchParams(await request.text());
      token = form.get("token") || "";
    }
    if (!token) {
      return NextResponse.json({ active: false }, { headers });
    }

    const payload = openPluginToken(token, "access");
    if (payload.iss !== PLUGIN_OAUTH_ISSUER) {
      return NextResponse.json({ active: false }, { headers });
    }

    return NextResponse.json(
      {
        active: true,
        scope: Array.isArray(payload.scopes) ? payload.scopes.join(" ") : "",
        client_id: payload.client_id,
        token_type: "Bearer",
        exp: payload.exp,
        iat: payload.iat,
        iss: payload.iss,
        aud: payload.aud,
        resource: payload.resource,
        shop: payload.shop
          ? {
              shop_id: payload.shop.shop_id,
              shop_name: payload.shop.shop_name,
              user_id: payload.shop.user_id,
            }
          : null,
      },
      { headers }
    );
  } catch {
    return NextResponse.json({ active: false }, { headers });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}
