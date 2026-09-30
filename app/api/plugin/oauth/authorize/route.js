import { NextResponse } from "next/server";
import { validateVaelonsRefreshToken } from "../../../../../lib/etsy";
import {
  PLUGIN_OAUTH_ISSUER,
  normalizeScopes,
  openPluginToken,
  safeOAuthRedirect,
  sealPluginToken,
  validatePluginResource,
} from "../../../../../lib/plugin-oauth";

export const dynamic = "force-dynamic";

const PENDING_COOKIE = "plugin_oauth_pending";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 10 * 60,
  path: "/",
};

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseInitialRequest(request) {
  const url = new URL(request.url);
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id") || "";
  const redirectUri = url.searchParams.get("redirect_uri") || "";
  const state = url.searchParams.get("state") || "";
  const codeChallenge = url.searchParams.get("code_challenge") || "";
  const codeChallengeMethod = url.searchParams.get("code_challenge_method") || "";
  const resource = validatePluginResource(url.searchParams.get("resource"));
  const scopes = normalizeScopes(url.searchParams.get("scope") || "vaelons:read");

  if (responseType !== "code") {
    const error = new Error("Yalnız authorization code akışı destekleniyor.");
    error.status = 400;
    error.oauthError = "unsupported_response_type";
    throw error;
  }
  if (!state) {
    const error = new Error("state zorunludur.");
    error.status = 400;
    throw error;
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    const error = new Error("PKCE S256 zorunludur.");
    error.status = 400;
    error.oauthError = "invalid_request";
    throw error;
  }

  const client = openPluginToken(clientId, "client");
  if (!Array.isArray(client.redirect_uris) || !client.redirect_uris.includes(redirectUri)) {
    const error = new Error("redirect_uri kayıtlı istemci ile eşleşmiyor.");
    error.status = 400;
    error.oauthError = "invalid_request";
    throw error;
  }

  const clientScopes = new Set(String(client.scope || "").split(/\s+/).filter(Boolean));
  if (scopes.some((scope) => !clientScopes.has(scope))) {
    const error = new Error("İstenen scope istemci kaydını aşıyor.");
    error.status = 400;
    error.oauthError = "invalid_scope";
    throw error;
  }

  return {
    client_id: clientId,
    client_name: client.client_name || "ChatGPT VAELONS Plugin",
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    resource,
    scopes,
  };
}

function consentHtml(requestToken, pending, shop) {
  const scopeLines = pending.scopes
    .map((scope) => {
      const label =
        scope === "vaelons:read"
          ? "VAELONS mağaza, listing, SEO ve taslak verilerini okuma"
          : scope === "vaelons:write"
            ? "Yalnız açık onay kapılarından geçen SEO/scheduler işlemlerini çalıştırma"
            : "Bağlantıyı yenilemek için refresh token kullanma";
      return `<li><strong>${htmlEscape(scope)}</strong> — ${htmlEscape(label)}</li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>VAELONS Etsy Manager Yetkilendirme</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0b0b0b;color:#f5f5f5;margin:0;padding:32px}main{max-width:720px;margin:0 auto;background:#151515;border:1px solid #2a2a2a;border-radius:18px;padding:28px}h1{margin-top:0}p,li{line-height:1.55;color:#d7d7d7}.shop{padding:12px 14px;background:#202020;border-radius:10px;margin:18px 0}.actions{display:flex;gap:12px;margin-top:24px}button{border:0;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer}.approve{background:#f4f4f4;color:#111}.deny{background:#2a2a2a;color:#f5f5f5}code{word-break:break-all}</style>
</head>
<body><main>
<h1>VAELONS Etsy Manager</h1>
<p><strong>${htmlEscape(pending.client_name)}</strong> bağlantısı ChatGPT üzerinden VAELONS araçlarına erişmek istiyor.</p>
<div class="shop">Doğrulanan mağaza: <strong>${htmlEscape(shop.shop_name)}</strong> (#${htmlEscape(shop.shop_id)})</div>
<ul>${scopeLines}</ul>
<p>SEO yayınlama için <strong>ONAYLIYORUM</strong>, rollback için <strong>GERI_AL ONAYLIYORUM</strong> backend kapıları ayrıca korunur. Bu ekran tek başına Etsy verisini değiştirmez.</p>
<form method="post" class="actions">
<input type="hidden" name="request_token" value="${htmlEscape(requestToken)}" />
<button class="approve" type="submit" name="decision" value="approve">İzin ver</button>
<button class="deny" type="submit" name="decision" value="deny">İptal</button>
</form>
</main></body></html>`;
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
    },
  });
}

async function renderConsent(request, pending, requestToken) {
  const refreshToken = request.cookies.get("etsy_refresh_token")?.value;
  if (!refreshToken) {
    const response = NextResponse.redirect(`${PLUGIN_OAUTH_ISSUER}/api/etsy/login`);
    response.cookies.set(PENDING_COOKIE, requestToken, COOKIE_OPTIONS);
    return response;
  }

  try {
    const shop = await validateVaelonsRefreshToken(refreshToken);
    return htmlResponse(consentHtml(requestToken, pending, shop));
  } catch {
    const response = NextResponse.redirect(`${PLUGIN_OAUTH_ISSUER}/api/etsy/login`);
    response.cookies.set(PENDING_COOKIE, requestToken, COOKIE_OPTIONS);
    response.cookies.set("etsy_refresh_token", "", { maxAge: 0, path: "/" });
    return response;
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    let pending;
    let requestToken;

    if (url.searchParams.get("resume") === "1") {
      requestToken = request.cookies.get(PENDING_COOKIE)?.value || "";
      pending = openPluginToken(requestToken, "pending");
    } else {
      pending = parseInitialRequest(request);
      requestToken = sealPluginToken("pending", pending, 10 * 60);
    }

    return renderConsent(request, pending, requestToken);
  } catch (error) {
    return htmlResponse(
      `<h1>Yetkilendirme başarısız</h1><p>${htmlEscape(error?.message || "OAuth isteği geçersiz.")}</p>`,
      error?.status || 400
    );
  }
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const requestToken = String(form.get("request_token") || "");
    const decision = String(form.get("decision") || "");
    const pending = openPluginToken(requestToken, "pending");

    openPluginToken(pending.client_id, "client");
    validatePluginResource(pending.resource);

    if (decision !== "approve") {
      const target = safeOAuthRedirect(pending.redirect_uri, {
        error: "access_denied",
        state: pending.state,
      });
      const response = NextResponse.redirect(target);
      response.cookies.set(PENDING_COOKIE, "", { maxAge: 0, path: "/" });
      return response;
    }

    const refreshToken = request.cookies.get("etsy_refresh_token")?.value;
    if (!refreshToken) {
      const response = NextResponse.redirect(`${PLUGIN_OAUTH_ISSUER}/api/etsy/login`);
      response.cookies.set(PENDING_COOKIE, requestToken, COOKIE_OPTIONS);
      return response;
    }

    const shop = await validateVaelonsRefreshToken(refreshToken);
    const code = sealPluginToken(
      "code",
      {
        client_id: pending.client_id,
        redirect_uri: pending.redirect_uri,
        code_challenge: pending.code_challenge,
        resource: pending.resource,
        scopes: pending.scopes,
        refresh_token: refreshToken,
        shop: {
          shop_id: shop.shop_id,
          shop_name: shop.shop_name,
          user_id: shop.user_id,
        },
      },
      5 * 60
    );

    const target = safeOAuthRedirect(pending.redirect_uri, {
      code,
      state: pending.state,
    });
    const response = NextResponse.redirect(target);
    response.cookies.set(PENDING_COOKIE, "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    return htmlResponse(
      `<h1>Yetkilendirme başarısız</h1><p>${htmlEscape(error?.message || "OAuth isteği tamamlanamadı.")}</p>`,
      error?.status || 400
    );
  }
}
