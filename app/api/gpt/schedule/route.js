import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { readGptRefreshToken } from "../../../../lib/gpt-action-token";
import { listDraftListings } from "../../../../lib/etsy";
import { scheduledEtsyPublishWorkflow } from "../../../../workflows/scheduled-etsy-publish";

export async function POST(request) {
  try {
    const refreshToken = readGptRefreshToken(request);
    const body = await request.json();
    const schedules = Array.isArray(body?.schedules) ? body.schedules : [];

    if (!schedules.length) {
      return NextResponse.json(
        { error: "En az bir ürün ve yayınlama zamanı gönder." },
        { status: 400 }
      );
    }

    if (schedules.length > 100) {
      return NextResponse.json(
        { error: "Tek istekte en fazla 100 ürün planlanabilir." },
        { status: 400 }
      );
    }

    const draftData = await listDraftListings(refreshToken);
    const draftIds = new Set(draftData.listings.map((item) => String(item.listing_id)));
    const now = Date.now();
    const maxMs = now + 85 * 24 * 60 * 60 * 1000;
    const normalized = [];

    for (const item of schedules) {
      const listingId = String(item?.listingId || "").trim();
      const publishAtMs = Date.parse(item?.publishAt || "");

      if (!/^\d+$/.test(listingId)) {
        return NextResponse.json({ error: `Geçersiz listing ID: ${listingId || "boş"}` }, { status: 400 });
      }

      if (!draftIds.has(listingId)) {
        return NextResponse.json(
          { error: `Listing #${listingId} şu anda VAELONS taslakları arasında değil.` },
          { status: 400 }
        );
      }

      if (!Number.isFinite(publishAtMs)) {
        return NextResponse.json(
          { error: `Listing #${listingId} için geçerli tarih-saat gönder.` },
          { status: 400 }
        );
      }

      if (publishAtMs < now + 15000) {
        return NextResponse.json(
          { error: `Listing #${listingId} için zaman en az 15 saniye ileride olmalı.` },
          { status: 400 }
        );
      }

      if (publishAtMs > maxMs) {
        return NextResponse.json(
          { error: `Listing #${listingId} en fazla 85 gün ileri planlanabilir.` },
          { status: 400 }
        );
      }

      normalized.push({ listingId, publishAt: new Date(publishAtMs).toISOString() });
    }

    const results = [];
    for (const item of normalized) {
      const run = await start(scheduledEtsyPublishWorkflow, [
        { listingId: item.listingId, publishAt: item.publishAt, refreshToken },
      ]);
      results.push({
        listingId: item.listingId,
        publishAt: item.publishAt,
        runId: run.runId,
      });
    }

    return NextResponse.json({
      ok: true,
      timezone: "Europe/Istanbul",
      count: results.length,
      scheduled: results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "GPT üzerinden planlama başarısız.",
        details: error.details || null,
      },
      { status: error.status || 500 }
    );
  }
}
