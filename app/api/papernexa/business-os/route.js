import { NextResponse } from "next/server";
import { buildBusinessOsAssets } from "../../../../lib/business-os";
import { openPaperNexaSecret, createDigitalListing } from "../../../../lib/papernexa";

export const runtime = "nodejs";
export const maxDuration = 60;

function credentials(request) {
  const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
  const encryptedRefresh = request.cookies.get("papernexa_refresh_token")?.value;

  if (encryptedRefresh) {
    return {
      apiKey: encryptedKey
        ? openPaperNexaSecret(encryptedKey)
        : process.env.ETSY_API_KEY,
      refreshToken: openPaperNexaSecret(encryptedRefresh),
      source: encryptedKey ? "papernexa" : "papernexa-server-key",
    };
  }

  const legacyRefresh = request.cookies.get("etsy_refresh_token")?.value;
  const legacyApiKey = process.env.ETSY_API_KEY;
  if (legacyApiKey && legacyRefresh) {
    return {
      apiKey: legacyApiKey,
      refreshToken: legacyRefresh,
      source: "existing",
    };
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const mode = String(body?.mode || "package").trim();
    const presetKey = String(body?.presetKey || "lawn-care").trim();
    const price = Number(body?.price || 14.9);
    const taxonomyId = String(body?.taxonomyId || "").trim();

    const assets = await buildBusinessOsAssets(presetKey);

    if (mode === "package") {
      return new Response(new Uint8Array(assets.sellerZipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="PaperNexa_${assets.preset.shortName.replace(/[^a-z0-9]+/gi, "_")}_Full_Set.zip"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (mode !== "draft" && mode !== "publish") {
      return NextResponse.json({ error: "Geçersiz Business OS işlem modu." }, { status: 400 });
    }
    if (!/^\d+$/.test(taxonomyId)) {
      return NextResponse.json({ error: "Önce uygun Etsy kategorisini seç." }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Geçerli bir satış fiyatı gir." }, { status: 400 });
    }

    const creds = credentials(request);
    if (!creds?.apiKey || !creds?.refreshToken) {
      return NextResponse.json(
        { error: "PaperNexa Etsy bağlantısı bulunamadı. Önce Etsy'yi yeniden bağla." },
        { status: 401 }
      );
    }

    const customerFile = {
      name: "PaperNexa_Lawn_Care_Business_OS.zip",
      blob: new Blob([new Uint8Array(assets.customerZipBuffer)], { type: "application/zip" }),
    };

    const images = assets.thumbnails.map((item) => ({
      name: item.name,
      blob: new Blob([new Uint8Array(item.buffer)], { type: "image/jpeg" }),
    }));

    const result = await createDigitalListing({
      apiKey: creds.apiKey,
      refreshToken: creds.refreshToken,
      title: assets.seo.title,
      description: assets.seo.description,
      price,
      taxonomyId,
      tags: assets.seo.tags,
      images,
      customerFile,
      activate: mode === "publish",
    });

    return NextResponse.json({
      ...result,
      product: assets.preset.name,
      connection_source: creds.source,
      thumbnail_count: images.length,
      tag_count: assets.seo.tags.length,
      customer_file: customerFile.name,
      mode,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Business OS paketi oluşturulamadı.",
        details: error.details || null,
      },
      { status: error.status || 500 }
    );
  }
}
