import crypto from "crypto";

const API = "https://api.etsy.com/v3/application";
const EXPECTED_SHOP = "papernexa";

function masterKey() {
  const base = process.env.ETSY_API_KEY;
  if (!base) throw new Error("Manager master anahtarı eksik.");
  return crypto.createHash("sha256").update(base + "|papernexa-v1", "utf8").digest();
}

export function sealPaperNexaSecret(value) {
  if (!value) throw new Error("Şifrelenmek istenen değer boş.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["pn1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function openPaperNexaSecret(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 4 || parts[0] !== "pn1") throw new Error("PaperNexa güvenli anahtarı geçersiz.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(parts[1], "base64url"));
  decipher.setAuthTag(Buffer.from(parts[2], "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parts[3], "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function keystring(apiKey) {
  return String(apiKey || "").split(":")[0];
}

async function parseResponse(response, label) {
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    const error = new Error(`${label} başarısız (${response.status}).`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

export async function refreshPaperNexaToken(apiKey, refreshToken) {
  const response = await fetch("https://api.etsy.com/v3/public/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: keystring(apiKey),
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  return parseResponse(response, "PaperNexa token yenileme");
}

function normalizeShopPayload(payload) {
  if (payload?.shop_id) return payload;
  if (Array.isArray(payload?.results) && payload.results.length) return payload.results[0];
  if (Array.isArray(payload) && payload.length) return payload[0];
  return null;
}

export async function resolvePaperNexaShop(apiKey, accessToken) {
  const userId = String(accessToken || "").split(".")[0];
  if (!/^\d+$/.test(userId)) throw new Error("Etsy kullanıcı kimliği çözülemedi.");
  const response = await fetch(`${API}/users/${userId}/shops`, {
    headers: { "x-api-key": apiKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = await parseResponse(response, "PaperNexa mağaza doğrulaması");
  const shop = normalizeShopPayload(payload);
  if (!shop?.shop_id) {
    const error = new Error("Yetkilendirilen Etsy hesabında mağaza bulunamadı.");
    error.status = 403;
    throw error;
  }
  if (String(shop.shop_name || "").trim().toLowerCase() !== EXPECTED_SHOP) {
    const error = new Error(`PaperNexa yerine farklı mağaza bağlandı: ${shop.shop_name || "bilinmiyor"}`);
    error.status = 403;
    throw error;
  }
  return shop;
}

export async function paperNexaSession(apiKey, refreshToken) {
  const token = await refreshPaperNexaToken(apiKey, refreshToken);
  const shop = await resolvePaperNexaShop(apiKey, token.access_token);
  return { token, shop };
}

export async function searchSellerTaxonomy(apiKey, query) {
  const response = await fetch(`${API}/seller-taxonomy/nodes`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });
  const data = await parseResponse(response, "Etsy kategori ağacını alma");
  const roots = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  const found = [];
  const q = String(query || "").trim().toLowerCase();
  function walk(node, parents = []) {
    if (!node) return;
    const path = [...parents, node.name || ""].filter(Boolean);
    const hay = path.join(" > ").toLowerCase();
    if (!q || q.split(/\s+/).every((part) => hay.includes(part))) {
      found.push({
        taxonomy_id: node.id ?? node.taxonomy_id,
        name: node.name,
        path: path.join(" > "),
      });
    }
    for (const child of node.children || []) walk(child, path);
  }
  for (const root of roots) walk(root);
  return found.filter((x) => x.taxonomy_id).slice(0, 80);
}

export async function createDigitalListing({
  apiKey,
  refreshToken,
  title,
  description,
  price,
  taxonomyId,
  tags,
  images,
  customerFile,
  activate,
}) {
  const { token, shop } = await paperNexaSession(apiKey, refreshToken);
  const accessToken = token.access_token;
  const authHeaders = {
    "x-api-key": apiKey,
    Authorization: `Bearer ${accessToken}`,
  };

  const body = new URLSearchParams({
    quantity: "999",
    title,
    description,
    price: String(price),
    who_made: "i_did",
    when_made: "2020_2026",
    taxonomy_id: String(taxonomyId),
    is_supply: "false",
    should_auto_renew: "true",
    type: "download",
  });
  if (Array.isArray(tags) && tags.length) body.set("tags", tags.join(","));

  const createResponse = await fetch(`${API}/shops/${shop.shop_id}/listings`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const listing = await parseResponse(createResponse, "PaperNexa taslak listing oluşturma");
  const listingId = listing?.listing_id;
  if (!listingId) throw new Error("Etsy listing ID döndürmedi.");

  try {
    let rank = 1;
    for (const image of images) {
      const fd = new FormData();
      fd.append("image", image.blob, image.name);
      fd.append("rank", String(rank++));
      const imageResponse = await fetch(
        `${API}/shops/${shop.shop_id}/listings/${listingId}/images`,
        { method: "POST", headers: authHeaders, body: fd, cache: "no-store" }
      );
      await parseResponse(imageResponse, `Thumbnail ${rank - 1} yükleme`);
    }

    const fileForm = new FormData();
    fileForm.append("file", customerFile.blob, customerFile.name);
    const fileResponse = await fetch(
      `${API}/shops/${shop.shop_id}/listings/${listingId}/files`,
      { method: "POST", headers: authHeaders, body: fileForm, cache: "no-store" }
    );
    await parseResponse(fileResponse, "Müşteri indirme dosyası yükleme");

    const patchBody = new URLSearchParams({ type: "download" });
    if (activate) patchBody.set("state", "active");
    const patchResponse = await fetch(
      `${API}/shops/${shop.shop_id}/listings/${listingId}`,
      {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/x-www-form-urlencoded" },
        body: patchBody,
        cache: "no-store",
      }
    );
    const updated = await parseResponse(patchResponse, activate ? "Listing yayınlama" : "Listing güncelleme");

    return {
      ok: true,
      listing_id: listingId,
      title: updated?.title || title,
      state: updated?.state || (activate ? "active" : "draft"),
      url: updated?.url || null,
      shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    };
  } catch (error) {
    error.details = {
      ...(error.details || {}),
      listing_id: listingId,
      note: "Listing taslak olarak kalmış olabilir; Etsy Manager'dan kontrol edebilirsin.",
    };
    throw error;
  }
}
