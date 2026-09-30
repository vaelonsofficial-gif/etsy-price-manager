import { NextResponse } from "next/server";
import {
  normalizeScopes,
  sealPluginToken,
  validateRedirectUris,
} from "../../../../../lib/plugin-oauth";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

export async function POST(request) {
  try {
    const body = await request.json();
    const redirectUris = validateRedirectUris(body?.redirect_uris);
    const tokenMethod = body?.token_endpoint_auth_method || "none";
    if (tokenMethod !== "none") {
      return NextResponse.json(
        { error: "invalid_client_metadata", error_description: "Only public PKCE clients are supported." },
        { status: 400, headers: cors }
      );
    }

    const grantTypes = Array.isArray(body?.grant_types)
      ? body.grant_types
      : ["authorization_code", "refresh_token"];
    if (!grantTypes.includes("authorization_code")) {
      return NextResponse.json(
        { error: "invalid_client_metadata", error_description: "authorization_code grant is required." },
        { status: 400, headers: cors }
      );
    }

    const responseTypes = Array.isArray(body?.response_types) ? body.response_types : ["code"];
    if (!responseTypes.includes("code")) {
      return NextResponse.json(
        { error: "invalid_client_metadata", error_description: "code response type is required." },
        { status: 400, headers: cors }
      );
    }

    const scopes = normalizeScopes(body?.scope || "vaelons:read vaelons:write offline_access");
    const issuedAt = Math.floor(Date.now() / 1000);
    const clientId = sealPluginToken(
      "client",
      {
        redirect_uris: redirectUris,
        client_name: String(body?.client_name || "ChatGPT VAELONS Plugin").slice(0, 120),
        scope: scopes.join(" "),
      },
      365 * 24 * 60 * 60
    );

    return NextResponse.json(
      {
        client_id: clientId,
        client_id_issued_at: issuedAt,
        client_secret_expires_at: 0,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: scopes.join(" "),
        client_name: String(body?.client_name || "ChatGPT VAELONS Plugin").slice(0, 120),
      },
      { status: 201, headers: cors }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_client_metadata",
        error_description: error?.message || "Client registration failed.",
      },
      { status: error?.status || 400, headers: cors }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
