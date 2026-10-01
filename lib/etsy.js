const API = "https://api.etsy.com/v3/application";

function apiKey() {
  const value = process.env.ETSY_API_KEY;
  if (!value) throw new Error("ETSY_API_KEY eksik.");
  return value;
}

function keystring() {
  return apiKey().split(":")[0];
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

export async function refreshEtsyAccessToken(refreshToken) {
  if (!refreshToken) throw new Error("Etsy refresh token bulunamadı.");

  const response = await fetch("https://api.etsy.com/v3/public/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: keystring(),
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  return parseResponse(response, "Etsy token yenileme");
}

async function resolveVaelonsShop(accessToken) {
  const userId = accessToken?.split(".")?.[0];
  if (!userId || !/^\d+$/.test(userId)) {
    throw new Error("Etsy kullanıcı kimliği çözülemedi.");
  }

  const response = await fetch(`${API}/users/${userId}/shops`, {
    headers: {
      "x-api-key": apiKey(),
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

async function session(refreshToken) {
  const token = await refreshEtsyAccessToken(refreshToken);
  const shop = await resolveVaelonsShop(token.access_token);
  return { token, shop };
}

export async function validateVaelonsRefreshToken(refreshToken) {
  const { shop } = await session(refreshToken);
  return {
    shop_id: shop.shop_id,
    shop_name: shop.shop_name,
    user_id: shop.user_id,
    verified: true,
  };
}

export async function listDraftListings(refreshToken) {
  const { token, shop } = await session(refreshToken);
  const url = new URL(`${API}/shops/${shop.shop_id}/listings`);
  url.searchParams.set("state", "draft");
  url.searchParams.set("limit", "100");
  url.searchParams.set("sort_on", "created");
  url.searchParams.set("sort_order", "desc");

  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey(),
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

export async function publishDraftListing({ listingId, refreshToken }) {
  const { token, shop } = await session(refreshToken);
  const id = String(listingId);

  const checkResponse = await fetch(`${API}/listings/${encodeURIComponent(id)}`, {
    headers: {
      "x-api-key": apiKey(),
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
        "x-api-key": apiKey(),
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

export async function getListingPriceInventory({ listingId, refreshToken }) {
  const { token, shop } = await session(refreshToken);
  const id = String(listingId);
  const listingResponse = await fetch(`${API}/listings/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": apiKey(), Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const listing = await parseResponse(listingResponse, "Listing doğrulaması");
  if (String(listing?.shop_id) !== String(shop.shop_id)) {
    const error = new Error("Bu listing yetkilendirilen Etsy mağazasına ait değil.");
    error.status = 403;
    throw error;
  }
  const response = await fetch(`${API}/listings/${encodeURIComponent(id)}/inventory`, {
    headers: { "x-api-key": apiKey(), Authorization: `Bearer ${token.access_token}` },
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

export async function updateSelectedListingPrices({ listingId, updates, refreshToken }) {
  if (!Array.isArray(updates) || updates.length < 1) throw new Error("En az bir fiyat değişikliği gerekli.");
  const { token, shop } = await session(refreshToken);
  const id = String(listingId);
  const listingResponse = await fetch(`${API}/listings/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": apiKey(), Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const listing = await parseResponse(listingResponse, "Listing doğrulaması");
  if (String(listing?.shop_id) !== String(shop.shop_id)) {
    const error = new Error("Bu listing yetkilendirilen Etsy mağazasına ait değil.");
    error.status = 403;
    throw error;
  }
  const invResponse = await fetch(`${API}/listings/${encodeURIComponent(id)}/inventory`, {
    headers: { "x-api-key": apiKey(), Authorization: `Bearer ${token.access_token}` },
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
      "x-api-key": apiKey(),
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


function variationKey(product) {
  return (product.property_values || []).map((p) => {
    const vals = (p.values || []).map((v) => String(v).trim()).sort();
    return `${String(p.property_name || p.property_id || "").trim()}=${vals.join("|")}`;
  }).sort().join("::");
}

function variationLabel(product) {
  return (product.property_values || []).map((p) =>
    `${p.property_name || "Varyasyon"}: ${(p.values || []).join(", ")}`
  ).join(" · ") || product.sku || "Standart";
}

async function listAllActiveListingsWithSession(token, shop) {
  const listings = [];
  let offset = 0;
  while (true) {
    const url = new URL(`${API}/shops/${shop.shop_id}/listings`);
    url.searchParams.set("state", "active");
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    const response = await fetch(url, { headers: { "x-api-key": apiKey(), Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
    const data = await parseResponse(response, "Aktif listingleri alma");
    const batch = data?.results || [];
    listings.push(...batch);
    if (batch.length < 100) break;
    offset += 100;
  }
  return listings;
}

async function rawInventory(listingId, accessToken) {
  const response = await fetch(`${API}/listings/${encodeURIComponent(listingId)}/inventory`, {
    headers: { "x-api-key": apiKey(), Authorization: `Bearer ${accessToken}` }, cache: "no-store"
  });
  return parseResponse(response, "Listing inventory alma");
}

export async function scanGlobalVariations(refreshToken) {
  const { token, shop } = await session(refreshToken);
  const listings = await listAllActiveListingsWithSession(token, shop);
  const groups = new Map();
  for (const listing of listings) {
    const inventory = await rawInventory(listing.listing_id, token.access_token);
    for (const product of inventory?.products || []) {
      const key = variationKey(product);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, { key, label: variationLabel(product), listing_count: 0, product_count: 0, prices: {}, matches: [] });
      const group = groups.get(key);
      group.listing_count += 1;
      group.product_count += 1;
      const price = normalizeMoney(product.offerings?.[0]?.price);
      group.prices[String(price)] = (group.prices[String(price)] || 0) + 1;
      group.matches.push({ listing_id: listing.listing_id, title: listing.title, product_id: product.product_id, current_price: price });
    }
  }
  return { shop: { shop_id: shop.shop_id, shop_name: shop.shop_name }, active_listing_count: listings.length, variations: [...groups.values()] };
}

export async function applyGlobalVariationPrice({ variationKey: targetKey, price, refreshToken }) {
  const nextPrice = Number(price);
  if (!targetKey) throw new Error("variationKey gerekli.");
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) throw new Error("Geçerli bir fiyat gerekli.");
  const { token, shop } = await session(refreshToken);
  const listings = await listAllActiveListingsWithSession(token, shop);
  const changed = [];
  for (const listing of listings) {
    const inventory = await rawInventory(listing.listing_id, token.access_token);
    const matchedIds = new Set((inventory?.products || []).filter((p) => variationKey(p) === targetKey).map((p) => String(p.product_id)));
    if (!matchedIds.size) continue;
    const products = (inventory.products || []).map((p) => ({
      sku: p.sku || "",
      property_values: p.property_values || [],
      offerings: (p.offerings || []).map((o) => ({
        price: matchedIds.has(String(p.product_id)) ? nextPrice : normalizeMoney(o.price),
        quantity: o.quantity, is_enabled: o.is_enabled
      }))
    }));
    const response = await fetch(`${API}/listings/${encodeURIComponent(listing.listing_id)}/inventory`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey(), Authorization: `Bearer ${token.access_token}` },
      body: JSON.stringify({ products, price_on_property: inventory.price_on_property || [], quantity_on_property: inventory.quantity_on_property || [], sku_on_property: inventory.sku_on_property || [] }),
      cache: "no-store"
    });
    await parseResponse(response, "Global varyasyon fiyatı güncelleme");
    changed.push({ listing_id: listing.listing_id, title: listing.title, products_changed: matchedIds.size });
  }
  return { ok: true, variation_key: targetKey, new_price: nextPrice, listings_changed: changed.length, changed };
}
