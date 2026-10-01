const API = "https://api.etsy.com/v3/application";

function apiKey(explicitValue) {
  const value = String(explicitValue || process.env.ETSY_API_KEY || "").trim();
  if (!value) throw new Error("ETSY_API_KEY eksik.");
  if (!value.includes(":")) throw new Error("Etsy API anahtarı keystring:shared_secret biçiminde olmalı.");
  return value;
}

function keystring(explicitValue) {
  return apiKey(explicitValue).split(":")[0];
}

async function parseResponse(response, label) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`${label} başarısız (${response.status}).`);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export async function refreshEtsyAccessToken(refreshToken, apiKeyValue) {
  if (!refreshToken) throw new Error("Etsy refresh token bulunamadı.");

  const response = await fetch("https://api.etsy.com/v3/public/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: keystring(apiKeyValue),
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  return parseResponse(response, "Etsy token yenileme");
}

async function resolveVaelonsShop(accessToken, apiKeyValue) {
  const userId = accessToken?.split(".")?.[0];
  if (!userId || !/^\d+$/.test(userId)) {
    throw new Error("Etsy kullanıcı kimliği çözülemedi.");
  }

  const response = await fetch(`${API}/users/${userId}/shops`, {
    headers: {
      "x-api-key": apiKey(apiKeyValue),
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const shop = await parseResponse(response, "Etsy mağaza doğrulaması");

  if (!shop?.shop_id || String(shop?.user_id) !== String(userId)) {
    const error = new Error("Yetkilendirilen Etsy hesabına ait mağaza doğrulanamadı.");
    error.status = 403;
    throw error;
  }

  const expected = process.env.ETSY_EXPECTED_SHOP_NAME?.trim().toLowerCase();
  if (expected) {
    const actual = String(shop.shop_name || "").trim().toLowerCase();
    if (actual !== expected) {
      const error = new Error(`Yetkilendirilen mağaza Manager ayarıyla eşleşmiyor: ${shop.shop_name || "bilinmiyor"}`);
      error.status = 403;
      throw error;
    }
  }

  return shop;
}

async function session(refreshToken, apiKeyValue) {
  const resolvedApiKey = apiKey(apiKeyValue);
  const token = await refreshEtsyAccessToken(refreshToken, resolvedApiKey);
  const shop = await resolveVaelonsShop(token.access_token, resolvedApiKey);
  return { token, shop, apiKey: resolvedApiKey };
}

export async function validateVaelonsRefreshToken(refreshToken, apiKeyValue) {
  const { shop } = await session(refreshToken, apiKeyValue);
  return {
    shop_id: shop.shop_id,
    shop_name: shop.shop_name,
    user_id: shop.user_id,
    verified: true,
  };
}

export async function listDraftListings(refreshToken, apiKeyValue) {
  const { token, shop, apiKey: resolvedApiKey } = await session(refreshToken, apiKeyValue);
  const url = new URL(`${API}/shops/${shop.shop_id}/listings`);
  url.searchParams.set("state", "draft");
  url.searchParams.set("limit", "100");
  url.searchParams.set("sort_on", "created");
  url.searchParams.set("sort_order", "desc");

  const response = await fetch(url, {
    headers: {
      "x-api-key": resolvedApiKey,
      Authorization: `Bearer ${token.access_token}`,
    },
    cache: "no-store",
  });

  const data = await parseResponse(response, "Taslak listingleri alma");
  return {
    shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    listings: (data?.results || []).map((listing) => ({
      listing_id: listing.listing_id,
      title: listing.title,
      state: listing.state,
      quantity: listing.quantity,
      updated_timestamp: listing.updated_timestamp,
    })),
  };
}

export async function publishDraftListing({ listingId, refreshToken, apiKey: apiKeyValue }) {
  const { token, shop, apiKey: resolvedApiKey } = await session(refreshToken, apiKeyValue);
  const id = String(listingId);

  const checkResponse = await fetch(`${API}/listings/${encodeURIComponent(id)}`, {
    headers: {
      "x-api-key": resolvedApiKey,
      Authorization: `Bearer ${token.access_token}`,
    },
    cache: "no-store",
  });
  const listing = await parseResponse(checkResponse, "Listing doğrulaması");

  if (String(listing?.shop_id) !== String(shop.shop_id)) {
    const error = new Error("Bu listing yetkilendirilen Etsy mağazasına ait değil.");
    error.status = 403;
    throw error;
  }

  if (listing?.state === "active") {
    return { ok: true, already_active: true, listing_id: listing.listing_id, title: listing.title };
  }

  if (listing?.state !== "draft") {
    throw new Error(`Listing yayınlanabilir taslak durumda değil. Mevcut durum: ${listing?.state || "bilinmiyor"}`);
  }

  const publishResponse = await fetch(
    `${API}/shops/${shop.shop_id}/listings/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": resolvedApiKey,
        Authorization: `Bearer ${token.access_token}`,
      },
      body: new URLSearchParams({ state: "active" }),
      cache: "no-store",
    }
  );

  const published = await parseResponse(publishResponse, "Etsy yayınlama");
  return {
    ok: true,
    already_active: false,
    listing_id: published?.listing_id || listing.listing_id,
    title: published?.title || listing.title,
    state: published?.state || "active",
  };
}


function normalizeMoney(money) {
  if (!money) return null;
  const divisor = Number(money.divisor || 100);
  return Number(money.amount || 0) / divisor;
}

export async function getListingPriceInventory({ listingId, refreshToken, apiKey: apiKeyValue }) {
  const { token, shop, apiKey: resolvedApiKey } = await session(refreshToken, apiKeyValue);
  const id = String(listingId);
  const listingResponse = await fetch(`${API}/listings/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": resolvedApiKey, Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const listing = await parseResponse(listingResponse, "Listing doğrulaması");
  if (String(listing?.shop_id) !== String(shop.shop_id)) {
    const error = new Error("Bu listing yetkilendirilen Etsy mağazasına ait değil.");
    error.status = 403;
    throw error;
  }
  const response = await fetch(`${API}/listings/${encodeURIComponent(id)}/inventory`, {
    headers: { "x-api-key": resolvedApiKey, Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const inventory = await parseResponse(response, "Listing inventory alma");
  return {
    shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    listing: { listing_id: listing.listing_id, title: listing.title, state: listing.state },
    products: (inventory?.products || []).map((p) => ({
      product_id: p.product_id,
      sku: p.sku || "",
      property_values: p.property_values || [],
      offerings: (p.offerings || []).map((o) => ({
        offering_id: o.offering_id,
        price: normalizeMoney(o.price),
        quantity: o.quantity,
        is_enabled: o.is_enabled,
        is_deleted: o.is_deleted || false,
      })),
    })),
    price_on_property: inventory?.price_on_property || [],
    quantity_on_property: inventory?.quantity_on_property || [],
    sku_on_property: inventory?.sku_on_property || [],
  };
}

export async function updateSelectedListingPrices({ listingId, updates, refreshToken, apiKey: apiKeyValue }) {
  if (!Array.isArray(updates) || updates.length < 1) throw new Error("En az bir fiyat değişikliği gerekli.");
  const { token, shop, apiKey: resolvedApiKey } = await session(refreshToken, apiKeyValue);
  const id = String(listingId);
  const listingResponse = await fetch(`${API}/listings/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": resolvedApiKey, Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const listing = await parseResponse(listingResponse, "Listing doğrulaması");
  if (String(listing?.shop_id) !== String(shop.shop_id)) {
    const error = new Error("Bu listing yetkilendirilen Etsy mağazasına ait değil.");
    error.status = 403;
    throw error;
  }
  const invResponse = await fetch(`${API}/listings/${encodeURIComponent(id)}/inventory`, {
    headers: { "x-api-key": resolvedApiKey, Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const inventory = await parseResponse(invResponse, "Listing inventory alma");
  const wanted = new Map(updates.map((u) => [String(u.productId), Number(u.price)]));
  for (const [productId, price] of wanted) {
    if (!Number.isFinite(price) || price <= 0) throw new Error(`Geçersiz fiyat: ${productId}`);
    if (!(inventory.products || []).some((p) => String(p.product_id) === productId)) {
      throw new Error(`Product ID inventory içinde bulunamadı: ${productId}`);
    }
  }
  const changed = [];
  const products = (inventory.products || []).map((p) => ({
    sku: p.sku || "",
    property_values: p.property_values || [],
    offerings: (p.offerings || []).map((o) => {
      const selected = wanted.has(String(p.product_id));
      const oldPrice = normalizeMoney(o.price);
      const nextPrice = selected ? wanted.get(String(p.product_id)) : oldPrice;
      if (selected) changed.push({ product_id: p.product_id, old_price: oldPrice, new_price: nextPrice });
      return { price: nextPrice, quantity: o.quantity, is_enabled: o.is_enabled };
    }),
  }));
  const response = await fetch(`${API}/listings/${encodeURIComponent(id)}/inventory`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": resolvedApiKey,
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({
      products,
      price_on_property: inventory.price_on_property || [],
      quantity_on_property: inventory.quantity_on_property || [],
      sku_on_property: inventory.sku_on_property || [],
    }),
    cache: "no-store",
  });
  await parseResponse(response, "Seçili fiyatları güncelleme");
  return { ok: true, listing_id: listing.listing_id, title: listing.title, changed };
}


function canonicalVariationValue(value) {
  let text = String(value ?? "")
    .replace(/&quot;|&#34;|&#x22;/gi, '"')
    .replace(/[“”″]/g, '"')
    .replace(/[×✕]/g, "x")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");

  // Size values are matched by their centimetre dimensions only.
  // This intentionally ignores inch text such as (5" x 7") and current price.
  const orderedSize = (a, b, unit) => {
    const values = [Number(String(a).replace(",", ".")), Number(String(b).replace(",", "."))].sort((x, y) => x - y);
    return `${values[0]}x${values[1]}${unit}`;
  };

  const cm = text.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm\b/i);
  if (cm) return orderedSize(cm[1], cm[2], "cm");

  // Inch-only labels such as 5" x 7" are normalized to their common rounded cm size.
  const inch = text.match(/(\d+(?:[.,]\d+)?)\s*"\s*x\s*(\d+(?:[.,]\d+)?)\s*"/i);
  if (inch) {
    const a = Math.round(Number(inch[1].replace(",", ".")) * 2.54);
    const b = Math.round(Number(inch[2].replace(",", ".")) * 2.54);
    return orderedSize(a, b, "cm");
  }

  return text.replace(/\s+/g, " ");
}

function variationKey(product) {
  // Match a variation by its VALUES only; current price never participates in matching.
  // Example: Rolled Canvas + 13x18 cm is the same target even if another listing
  // uses a different property label or a different existing price.
  return (product.property_values || [])
    .flatMap((p) => (p.values || []).map(canonicalVariationValue))
    .filter(Boolean)
    .sort()
    .join("::");
}

function variationMatchesTarget(product, targetKey) {
  const wanted = String(targetKey || "").split("::").filter(Boolean);
  if (!wanted.length) return false;
  const actual = new Set(
    (product.property_values || [])
      .flatMap((p) => (p.values || []).map(canonicalVariationValue))
      .filter(Boolean)
  );
  // Target values must be present, but listings may contain extra variation dimensions.
  return wanted.every((value) => actual.has(value));
}

function variationLabel(product) {
  return (product.property_values || []).map((p) =>
    `${p.property_name || "Varyasyon"}: ${(p.values || []).join(", ")}`
  ).join(" · ") || product.sku || "Standart";
}

async function listAllActiveListingsWithSession(token, shop, apiKeyValue) {
  const listings = [];
  let offset = 0;
  while (true) {
    const url = new URL(`${API}/shops/${shop.shop_id}/listings`);
    url.searchParams.set("state", "active");
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    const response = await fetch(url, { headers: { "x-api-key": apiKey(apiKeyValue), Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
    const data = await parseResponse(response, "Aktif listingleri alma");
    const batch = data?.results || [];
    listings.push(...batch);
    const total = Number(data?.count);
    offset += batch.length;
    if (!batch.length) break;
    if (Number.isFinite(total) && listings.length >= total) break;
    if (!Number.isFinite(total) && batch.length < 100) break;
  }
  return listings;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRateLimit(url, options, label) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return parseResponse(response, label);
    const retryAfter = Number(response.headers.get("retry-after") || 0);
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(30000, 1500 * Math.pow(2, attempt));
    await sleep(waitMs + 250);
  }
  const error = new Error("Etsy istek sınırı devam ediyor. İşlem güvenli biçimde durduruldu; fiyatlar yeniden yazılmadı.");
  error.status = 429;
  throw error;
}

async function rawInventory(listingId, accessToken, apiKeyValue) {
  return fetchWithRateLimit(`${API}/listings/${encodeURIComponent(listingId)}/inventory`, {
    headers: { "x-api-key": apiKey(apiKeyValue), Authorization: `Bearer ${accessToken}` }, cache: "no-store"
  }, "Listing inventory alma");
}

export async function scanGlobalVariations(refreshToken, apiKeyValue) {
  const { token, shop, apiKey: resolvedApiKey } = await session(refreshToken, apiKeyValue);
  const listings = await listAllActiveListingsWithSession(token, shop, resolvedApiKey);
  if (!listings.length) return { shop: { shop_id: shop.shop_id, shop_name: shop.shop_name }, reference_listing: null, variations: [] };

  // Read exactly ONE active listing as the variation template. This avoids Etsy rate limits.
  const listing = listings[0];
  const inventory = await rawInventory(listing.listing_id, token.access_token, resolvedApiKey);
  const variations = (inventory?.products || []).map((product) => {
    const price = normalizeMoney(product.offerings?.[0]?.price);
    return {
      key: variationKey(product),
      label: variationLabel(product),
      current_price: price,
      prices: { [String(price)]: 1 },
      reference_product_id: product.product_id
    };
  }).filter((v) => v.key);

  return {
    shop: { shop_id: shop.shop_id, shop_name: shop.shop_name },
    reference_listing: { listing_id: listing.listing_id, title: listing.title },
    active_listing_count: listings.length,
    variations
  };
}

export async function previewGlobalVariationPrice({ variationKey: targetKey, refreshToken, apiKey: apiKeyValue }) {
  if (!targetKey) throw new Error("variationKey gerekli.");
  const { token, shop, apiKey: resolvedApiKey } = await session(refreshToken, apiKeyValue);
  const listings = await listAllActiveListingsWithSession(token, shop, resolvedApiKey);
  const matched = [];
  for (const listing of listings) {
    const inventory = await rawInventory(listing.listing_id, token.access_token, resolvedApiKey);
    const count = (inventory?.products || []).filter((p) => variationMatchesTarget(p, targetKey)).length;
    if (count) matched.push({ listing_id: listing.listing_id, title: listing.title, products_matched: count });
  }
  return { ok: true, preview: true, variation_key: targetKey, active_listings_scanned: listings.length, matched_listing_count: matched.length, matched };
}

export async function applyGlobalVariationPrice({ variationKey: targetKey, price, refreshToken, apiKey: apiKeyValue, listingIds }) {
  const nextPrice = Number(price);
  if (!targetKey) throw new Error("variationKey gerekli.");
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) throw new Error("Geçerli bir fiyat gerekli.");

  const requestedIds = Array.isArray(listingIds)
    ? [...new Set(listingIds.map((id) => String(id)).filter((id) => /^\d+$/.test(id)))]
    : [];
  if (requestedIds.length > 30) {
    const error = new Error("Tek toplu istekte en fazla 30 listing güncellenebilir.");
    error.status = 400;
    throw error;
  }

  const { token, shop, apiKey: resolvedApiKey } = await session(refreshToken, apiKeyValue);
  const activeListings = await listAllActiveListingsWithSession(token, shop, resolvedApiKey);
  const allowed = new Map(activeListings.map((listing) => [String(listing.listing_id), listing]));
  const listings = requestedIds.length
    ? requestedIds.map((id) => allowed.get(id)).filter(Boolean)
    : activeListings;

  const changed = [];
  const skipped = [];

  for (const listing of listings) {
    const inventory = await rawInventory(listing.listing_id, token.access_token, resolvedApiKey);
    const matchedIds = new Set(
      (inventory?.products || [])
        .filter((p) => variationMatchesTarget(p, targetKey))
        .map((p) => String(p.product_id))
    );

    if (!matchedIds.size) {
      skipped.push({ listing_id: listing.listing_id, reason: "varyasyon_eslesmedi" });
      continue;
    }

    const products = (inventory.products || []).map((p) => ({
      sku: p.sku || "",
      property_values: p.property_values || [],
      offerings: (p.offerings || []).map((o) => ({
        price: matchedIds.has(String(p.product_id)) ? nextPrice : normalizeMoney(o.price),
        quantity: o.quantity,
        is_enabled: o.is_enabled
      }))
    }));

    await fetchWithRateLimit(
      `${API}/listings/${encodeURIComponent(listing.listing_id)}/inventory`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": resolvedApiKey,
          Authorization: `Bearer ${token.access_token}`
        },
        body: JSON.stringify({
          products,
          price_on_property: inventory.price_on_property || [],
          quantity_on_property: inventory.quantity_on_property || [],
          sku_on_property: inventory.sku_on_property || []
        }),
        cache: "no-store"
      },
      "Global varyasyon fiyatı güncelleme"
    );

    changed.push({
      listing_id: listing.listing_id,
      title: listing.title,
      products_changed: matchedIds.size
    });
  }

  return {
    ok: true,
    variation_key: targetKey,
    new_price: nextPrice,
    requested_listing_count: requestedIds.length || listings.length,
    listings_changed: changed.length,
    skipped_count: skipped.length,
    changed,
    skipped
  };
}
