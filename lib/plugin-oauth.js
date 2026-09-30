import crypto from "crypto";

export const PLUGIN_OAUTH_ISSUER = "https://etsy-price-manager.vercel.app";
export const PLUGIN_OAUTH_SCOPES = ["vaelons:read", "vaelons:write", "offline_access"];

const PREFIX = {
  client: "vpc1",
  pending: "vpp1",
  code: "vcode1",
  access: "vpa1",
  refresh: "vpr1",
};

function encryptionKey() {
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) throw new Error("ETSY_API_KEY eksik.");
  return crypto
    .createHash("sha256")
    .update(`${apiKey}|vaelons-plugin-oauth-v1`, "utf8")
    .digest();
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function decode(value) {
  return Buffer.from(value, "base64url");
}

export function sealPluginToken(kind, payload, ttlSeconds) {
  if (!PREFIX[kind]) throw new Error("Geçersiz plugin token türü.");
  const now = Math.floor(Date.now() / 1000);
  const body = {
    v: 1,
    kind,
    iat: now,
    exp: now + ttlSeconds,
    ...payload,
  };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(body), "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX[kind]}.${encode(iv)}.${encode(tag)}.${encode(encrypted)}`;
}

export function openPluginToken(token, expectedKind) {
  const value = String(token || "").trim();
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX[expectedKind]) {
    const error = new Error("Geçersiz plugin tokenı.");
    error.status = 401;
    throw error;
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      decode(parts[1])
    );
    decipher.setAuthTag(decode(parts[2]));
    const decrypted = Buffer.concat([
      decipher.update(decode(parts[3])),
      decipher.final(),
    ]);
    const payload = JSON.parse(decrypted.toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (
      payload?.v !== 1 ||
      payload?.kind !== expectedKind ||
      !Number.isFinite(payload?.exp) ||
      payload.exp <= now
    ) {
      throw new Error("expired_or_invalid");
    }
    return payload;
  } catch (cause) {
    const error = new Error(
      cause?.message === "expired_or_invalid"
        ? "Plugin tokenının süresi dolmuş veya token geçersiz."
        : "Plugin tokenı doğrulanamadı."
    );
    error.status = 401;
    throw error;
  }
}

export function normalizeScopes(scopeValue) {
  const requested = Array.isArray(scopeValue)
    ? scopeValue
    : String(scopeValue || "")
        .split(/\s+/)
        .filter(Boolean);
  const unique = [...new Set(requested)];
  const invalid = unique.filter((scope) => !PLUGIN_OAUTH_SCOPES.includes(scope));
  if (invalid.length) {
    const error = new Error(`Desteklenmeyen scope: ${invalid.join(", ")}`);
    error.status = 400;
    error.oauthError = "invalid_scope";
    throw error;
  }
  return unique.length ? unique : ["vaelons:read"];
}

function isAllowedChatGptRedirect(uri) {
  try {
    const url = new URL(uri);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "chatgpt.com") {
      return (
        url.pathname === "/connector_platform_oauth_redirect" ||
        url.pathname.startsWith("/oauth/")
      );
    }
    if (url.hostname === "chat.openai.com") {
      return url.pathname.startsWith("/aip/") || url.pathname.startsWith("/oauth/");
    }
    return false;
  } catch {
    return false;
  }
}

export function validateRedirectUris(redirectUris) {
  if (!Array.isArray(redirectUris) || !redirectUris.length || redirectUris.length > 8) {
    const error = new Error("redirect_uris zorunludur.");
    error.status = 400;
    throw error;
  }
  const normalized = [...new Set(redirectUris.map((value) => String(value || "").trim()))];
  if (normalized.some((uri) => !isAllowedChatGptRedirect(uri))) {
    const error = new Error("Yalnız resmi ChatGPT OAuth callback adreslerine izin verilir.");
    error.status = 400;
    throw error;
  }
  return normalized;
}

export function validatePluginResource(resource) {
  const value = String(resource || "").trim();
  try {
    const url = new URL(value);
    const allowedHosts = new Set([
      "vaelons-etsy-seller-bridge.vercel.app",
      "vaelons-etsy-seller-bridge-3dql.vercel.app",
      "vaelons-etsy-seller-bridge-x2bh.vercel.app",
    ]);
    if (
      url.protocol !== "https:" ||
      !allowedHosts.has(url.hostname) ||
      url.pathname !== "/api/mcp"
    ) {
      throw new Error("invalid_resource");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    const error = new Error("Geçersiz MCP resource adresi.");
    error.status = 400;
    error.oauthError = "invalid_target";
    throw error;
  }
}

export function verifyPkceS256(verifier, challenge) {
  const actual = crypto
    .createHash("sha256")
    .update(String(verifier || ""), "utf8")
    .digest("base64url");
  const expected = String(challenge || "");
  if (!expected || actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function readBearer(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? String(match[1]).trim() : "";
}

export function hasScope(payload, requiredScope) {
  return Array.isArray(payload?.scopes) && payload.scopes.includes(requiredScope);
}

export function oauthJsonError(error, fallbackStatus = 400) {
  const status = error?.status || fallbackStatus;
  return {
    status,
    body: {
      error: error?.oauthError || (status === 401 ? "invalid_token" : "invalid_request"),
      error_description: error?.message || "OAuth isteği başarısız.",
    },
  };
}

export function safeOAuthRedirect(redirectUri, params) {
  const target = new URL(redirectUri);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      target.searchParams.set(key, String(value));
    }
  }
  return target;
}
