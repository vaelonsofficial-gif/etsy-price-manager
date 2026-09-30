import {
  PLUGIN_OAUTH_ISSUER,
  hasScope,
  openPluginToken,
  readBearer,
  validatePluginResource,
} from "./plugin-oauth";

export function readPluginAccess(request, requiredScope = "vaelons:read") {
  const token = readBearer(request);
  if (!token) {
    const error = new Error("Plugin access token gerekli.");
    error.status = 401;
    throw error;
  }

  const payload = openPluginToken(token, "access");
  if (payload.iss !== PLUGIN_OAUTH_ISSUER) {
    const error = new Error("Plugin token issuer geçersiz.");
    error.status = 401;
    throw error;
  }

  validatePluginResource(payload.resource);

  if (!payload.refresh_token || !payload.shop?.shop_id) {
    const error = new Error("Plugin token oturumu eksik.");
    error.status = 401;
    throw error;
  }

  if (requiredScope && !hasScope(payload, requiredScope)) {
    const error = new Error(`Gerekli scope eksik: ${requiredScope}`);
    error.status = 403;
    throw error;
  }

  return payload;
}
