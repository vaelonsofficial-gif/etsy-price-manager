import crypto from "crypto";

function encryptionKey() {
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) throw new Error("ETSY_API_KEY eksik.");
  return crypto
    .createHash("sha256")
    .update(`${apiKey}|vaelons-gpt-action-v1`, "utf8")
    .digest();
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function decode(value) {
  return Buffer.from(value, "base64url");
}

export function createGptActionToken(refreshToken) {
  if (!refreshToken) throw new Error("Etsy refresh token bulunamadı.");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const payload = Buffer.from(
    JSON.stringify({ v: 1, refreshToken, issuedAt: Date.now() }),
    "utf8"
  );
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `vg1.${encode(iv)}.${encode(tag)}.${encode(encrypted)}`;
}

function normalizeBearerToken(value) {
  let token = String(value || "").trim();

  // Some clients may accidentally include an extra "Bearer " prefix inside
  // the configured secret, producing "Authorization: Bearer Bearer <token>".
  token = token.replace(/^Bearer\s+/i, "").trim();

  // Be tolerant of copy/paste wrappers without weakening token validation.
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  return token;
}

export function readGptRefreshToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("GPT Action anahtarı gerekli.");
    error.status = 401;
    throw error;
  }

  const token = normalizeBearerToken(match[1]);
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "vg1") {
    const error = new Error("Geçersiz GPT Action anahtarı.");
    error.status = 401;
    throw error;
  }

  try {
    const iv = decode(parts[1]);
    const tag = decode(parts[2]);
    const encrypted = decode(parts[3]);
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf8"));

    if (payload?.v !== 1 || !payload?.refreshToken) throw new Error("invalid payload");
    return payload.refreshToken;
  } catch {
    const error = new Error("GPT Action anahtarı doğrulanamadı.");
    error.status = 401;
    throw error;
  }
}
