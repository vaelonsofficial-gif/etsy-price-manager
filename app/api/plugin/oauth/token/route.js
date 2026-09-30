import { NextResponse } from "next/server";
import { validateVaelonsRefreshToken } from "../../../../../lib/etsy";
import {
  PLUGIN_OAUTH_ISSUER,
  openPluginToken,
  sealPluginToken,
  validatePluginResource,
  verifyPkceS256,
} from "../../../../../lib/plugin-oauth";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

function oauthError(error, status = 400) {
  return NextResponse.json(
    {
      error: error?.oauthError || "invalid_grant",
      error_description: error?.message || "Token isteği başarısız.",
    },
    { status: error?.status || status, headers: cors }
  );
}

function validateClient(clientId) {
  if (!clientId) {
    const error = new Error("client_id zorunludur.");
    error.oauthError = "invalid_client";
    error.status = 401;
    throw error;
  }
  return openPluginToken(clientId, "client");
}

async function issueTokens({ clientId, resource, scopes, refreshToken, shop }) {
  const accessToken = sealPluginToken(
    "access",
    {
      iss: PLUGIN_OAUTH_ISSUER,
      aud: resource,
      resource,
      client_id: clientId,
      scopes,
      refresh_token: refreshToken,
      shop,
    },
    60 * 60
  );

  const response = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 60 * 60,
    scope: scopes.join(" "),
    resource,
  };

  if (scopes.includes("offline_access")) {
    response.refresh_token = sealPluginToken(
      "refresh",
      {
        iss: PLUGIN_OAUTH_ISSUER,
        aud: resource,
        resource,
        client_id: clientId,
        scopes,
        refresh_token: refreshToken,
        shop,
      },
      90 * 24 * 60 * 60
    );
  }

  return response;
}

export async function POST(request) {
  try {
    const raw = await request.text();
    const form = new URLSearchParams(raw);
    const grantType = form.get("grant_type") || "";
    const clientId = form.get("client_id") || "";
    validateClient(clientId);

    if (grantType === "authorization_code") {
      const codePayload = openPluginToken(form.get("code") || "", "code");
      const redirectUri = form.get("redirect_uri") || "";
      const resource = validatePluginResource(form.get("resource") || codePayload.resource);
      const codeVerifier = form.get("code_verifier") || "";

      if (codePayload.client_id !== clientId) {
        const error = new Error("Authorization code farklı client_id için üretildi.");
        error.oauthError = "invalid_grant";
        throw error;
      }
      if (codePayload.redirect_uri !== redirectUri) {
        const error = new Error("redirect_uri authorization code ile eşleşmiyor.");
        error.oauthError = "invalid_grant";
        throw error;
      }
      if (codePayload.resource !== resource) {
        const error = new Error("resource authorization code ile eşleşmiyor.");
        error.oauthError = "invalid_target";
        throw error;
      }
      if (!verifyPkceS256(codeVerifier, codePayload.code_challenge)) {
        const error = new Error("PKCE code_verifier doğrulanamadı.");
        error.oauthError = "invalid_grant";
        throw error;
      }

      const verifiedShop = await validateVaelonsRefreshToken(codePayload.refresh_token);
      const shop = {
        shop_id: verifiedShop.shop_id,
        shop_name: verifiedShop.shop_name,
        user_id: verifiedShop.user_id,
      };

      return NextResponse.json(
        await issueTokens({
          clientId,
          resource,
          scopes: codePayload.scopes,
          refreshToken: codePayload.refresh_token,
          shop,
        }),
        { headers: cors }
      );
    }

    if (grantType === "refresh_token") {
      const refreshPayload = openPluginToken(form.get("refresh_token") || "", "refresh");
      const resource = validatePluginResource(form.get("resource") || refreshPayload.resource);

      if (refreshPayload.client_id !== clientId) {
        const error = new Error("Refresh token farklı client_id için üretildi.");
        error.oauthError = "invalid_grant";
        throw error;
      }
      if (refreshPayload.resource !== resource) {
        const error = new Error("resource refresh token ile eşleşmiyor.");
        error.oauthError = "invalid_target";
        throw error;
      }

      const verifiedShop = await validateVaelonsRefreshToken(refreshPayload.refresh_token);
      const shop = {
        shop_id: verifiedShop.shop_id,
        shop_name: verifiedShop.shop_name,
        user_id: verifiedShop.user_id,
      };

      return NextResponse.json(
        await issueTokens({
          clientId,
          resource,
          scopes: refreshPayload.scopes,
          refreshToken: refreshPayload.refresh_token,
          shop,
        }),
        { headers: cors }
      );
    }

    return NextResponse.json(
      {
        error: "unsupported_grant_type",
        error_description: "Yalnız authorization_code ve refresh_token destekleniyor.",
      },
      { status: 400, headers: cors }
    );
  } catch (error) {
    return oauthError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
