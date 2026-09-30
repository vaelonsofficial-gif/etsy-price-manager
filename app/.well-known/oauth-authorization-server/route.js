import { NextResponse } from "next/server";
import { PLUGIN_OAUTH_ISSUER, PLUGIN_OAUTH_SCOPES } from "../../../lib/plugin-oauth";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

export async function GET() {
  return NextResponse.json(
    {
      issuer: PLUGIN_OAUTH_ISSUER,
      authorization_endpoint: `${PLUGIN_OAUTH_ISSUER}/api/plugin/oauth/authorize`,
      token_endpoint: `${PLUGIN_OAUTH_ISSUER}/api/plugin/oauth/token`,
      registration_endpoint: `${PLUGIN_OAUTH_ISSUER}/api/plugin/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: PLUGIN_OAUTH_SCOPES,
    },
    { headers: cors }
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
