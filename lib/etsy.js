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
