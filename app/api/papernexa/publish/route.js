import { NextResponse } from "next/server";
import JSZip from "jszip";
import {
  openPaperNexaSecret,
  createDigitalListing,
} from "../../../../lib/papernexa";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseSeo(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  const titleMatch = normalized.match(/(?:^|\n)TITLE\s*\n([\s\S]*?)(?=\n\s*\nDESCRIPTION\s*\n)/i);
  const descMatch = normalized.match(/(?:^|\n)DESCRIPTION\s*\n([\s\S]*?)(?=\n\s*\n(?:13\s+)?TAGS?\s*\n)/i);
  const tagsMatch = normalized.match(/(?:^|\n)(?:13\s+)?TAGS?\s*\n([\s\S]*)$/i);

  const title = titleMatch?.[1]?.trim() || "";
  const description = descMatch?.[1]?.trim() || "";
  const tags = (tagsMatch?.[1] || "")
    .split("\n")
    .map((x) => x.replace(/^[-•\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 13);

  return { title, description, tags };
}

function chooseEntry(zip, predicate) {
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  return entries.find(predicate) || null;
}

function credentials(request) {
  const encryptedKey = request.cookies.get("papernexa_api_key")?.value;
  const encryptedRefresh = request.cookies.get("papernexa_refresh_token")?.value;

  if (encryptedKey && encryptedRefresh) {
    return {
      apiKey: openPaperNexaSecret(encryptedKey),
      refreshToken: openPaperNexaSecret(encryptedRefresh),
      source: "papernexa",
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
    const creds = credentials(request);
    if (!creds) {
      return NextResponse.json(
        { error: "Bu tarayıcıda mevcut PaperNexa Etsy oturumu bulunamadı." },
        { status: 401 }
      );
    }

    const form = await request.formData();
    const packageFile = form.get("package");
    const taxonomyId = String(form.get("taxonomyId") || "").trim();
    const price = Number(form.get("price") || 0);
    const activate = String(form.get("activate") || "false") === "true";

    if (!(packageFile instanceof File) || packageFile.size < 1) {
      return NextResponse.json({ error: "Full seller package ZIP gerekli." }, { status: 400 });
    }
    if (!/^\d+$/.test(taxonomyId)) {
      return NextResponse.json({ error: "Geçerli Etsy kategori numarası seç." }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Geçerli bir fiyat gir." }, { status: 400 });
    }
    if (packageFile.size > 4.2 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "Full seller ZIP 4.2 MB sınırını aşıyor.",
          size_mb: Math.round((packageFile.size / 1024 / 1024) * 100) / 100,
        },
        { status: 413 }
      );
    }

    const zip = await JSZip.loadAsync(await packageFile.arrayBuffer());
    const seoEntry = chooseEntry(zip, (entry) =>
      /(?:ETSY_)?SEO\.txt$/i.test(entry.name) || /ETSY.*SEO.*\.txt$/i.test(entry.name)
    );
    const customerEntry = chooseEntry(zip, (entry) =>
      /Customer_Download.*\.zip$/i.test(entry.name)
    );
    const imageEntries = Object.values(zip.files)
      .filter(
        (entry) =>
          !entry.dir &&
          /ETSY_THUMBNAILS\//i.test(entry.name) &&
          /\.(jpe?g|png|webp)$/i.test(entry.name)
      )
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .slice(0, 10);

    if (!seoEntry) {
      return NextResponse.json({ error: "Paket içinde Etsy SEO TXT bulunamadı." }, { status: 400 });
    }
    if (!customerEntry) {
      return NextResponse.json({ error: "Paket içinde Customer_Download ZIP bulunamadı." }, { status: 400 });
    }
    if (imageEntries.length < 1) {
      return NextResponse.json({ error: "Paket içinde Etsy thumbnail bulunamadı." }, { status: 400 });
    }

    const seo = parseSeo(await seoEntry.async("string"));
    if (!seo.title || !seo.description) {
      return NextResponse.json({ error: "SEO başlık veya açıklama okunamadı." }, { status: 400 });
    }
    if (seo.title.length > 140) {
      return NextResponse.json({ error: "Etsy başlığı 140 karakteri aşıyor." }, { status: 400 });
    }
    const invalidTags = seo.tags.filter((tag) => tag.length > 20);
    if (invalidTags.length) {
      return NextResponse.json(
        { error: "20 karakteri aşan Etsy tagleri var.", invalid_tags: invalidTags },
        { status: 400 }
      );
    }

    const customerBytes = await customerEntry.async("uint8array");
    if (customerBytes.byteLength > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Müşteri ZIP'i Etsy 20 MB sınırını aşıyor." }, { status: 400 });
    }

    const customerFile = {
      name: customerEntry.name.split("/").pop() || "PaperNexa_Customer_Download.zip",
      blob: new Blob([customerBytes], { type: "application/zip" }),
    };

    const images = [];
    for (const entry of imageEntries) {
      const bytes = await entry.async("uint8array");
      const lower = entry.name.toLowerCase();
      const type = lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
      images.push({
        name: entry.name.split("/").pop() || `thumbnail-${images.length + 1}.jpg`,
        blob: new Blob([bytes], { type }),
      });
    }

    const result = await createDigitalListing({
      apiKey: creds.apiKey,
      refreshToken: creds.refreshToken,
      title: seo.title,
      description: seo.description,
      price,
      taxonomyId,
      tags: seo.tags,
      images,
      customerFile,
      activate,
    });

    return NextResponse.json({
      ...result,
      connection_source: creds.source,
      thumbnail_count: images.length,
      tag_count: seo.tags.length,
      customer_file: customerFile.name,
      mode: activate ? "published" : "draft",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "PaperNexa listing oluşturulamadı.",
        details: error.details || null,
      },
      { status: error.status || 500 }
    );
  }
}
