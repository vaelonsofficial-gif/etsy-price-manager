import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { listDraftListings } from "../../../../lib/etsy";
import { readPluginAccess } from "../../../../lib/plugin-access";
import { scheduledEtsyPublishWorkflow } from "../../../../workflows/scheduled-etsy-publish";

export const dynamic = "force-dynamic";

const REQUIRED_APPROVAL = "ONAYLIYORUM";

export async function POST(request) {
  try {
    const auth = readPluginAccess(request, "vaelons:write");
    const body = await request.json();

    if (body?.approval !== REQUIRED_APPROVAL) {
      return NextResponse.json(
        {
          error: `Yayın planlama için approval tam olarak ${REQUIRED_APPROVAL} olmalı.`,
          etsy_modified: false,
        },
        { status: 403 }
      );
    }

    const schedules = Array.isArray(body?.schedules) ? body.schedules : [];
    if (!schedules.length) {
      return NextResponse.json(
        { error: "En az bir ürün ve yayınlama zamanı gönder.", etsy_modified: false },
        { status: 400 }
      );
    }
    if (schedules.length > 100) {
      return NextResponse.json(
        { error: "Tek istekte en fazla 100 ürün planlanabilir.", etsy_modified: false },
        { status: 400 }
      );
    }

    const draftData = await listDraftListings(auth.refresh_token);
    const draftIds = new Set(draftData.listings.map((item) => String(item.listing_id)));
    const now = Date.now();
    const maxMs = now + 85 * 24 * 60 * 60 * 1000;
    const normalized = [];

    for (const item of schedules) {
      const listingId = String(item?.listingId || "").trim();
      const publishAtMs = Date.parse(item?.publishAt || "");

      if (!/^\d+$/.test(listingId)) {
        return NextResponse.json(
          { error: `Geçersiz listing ID: ${listingId || "boş"}`, etsy_modified: false },
          { status: 400 }
        );
      }
      if (!draftIds.has(listingId)) {
        return NextResponse.json(
          { error: `Listing #${listingId} şu anda VAELONS taslakları arasında değil.`, etsy_modified: false },
          { status: 400 }
        );
      }
      if (!Number.isFinite(publishAtMs)) {
        return NextResponse.json(
          { error: `Listing #${listingId} için geçerli tarih-saat gönder.`, etsy_modified: false },
          { status: 400 }
        );
      }
      if (publishAtMs < now + 15000) {
        return NextResponse.json(
          { error: `Listing #${listingId} için zaman en az 15 saniye ileride olmalı.`, etsy_modified: false },
          { status: 400 }
        );
      }
      if (publishAtMs > maxMs) {
        return NextResponse.json(
          { error: `Listing #${listingId} en fazla 85 gün ileri planlanabilir.`, etsy_modified: false },
          { status: 400 }
        );
      }

      normalized.push({ listingId, publishAt: new Date(publishAtMs).toISOString() });
    }

    const scheduled = [];
    for (const item of normalized) {
      const run = await start(scheduledEtsyPublishWorkflow, [
        { listingId: item.listingId, publishAt: item.publishAt, refreshToken: auth.refresh_token },
      ]);
      scheduled.push({
        listingId: item.listingId,
        publishAt: item.publishAt,
        runId: run.runId,
      });
    }

    return NextResponse.json({
      ok: true,
      timezone: "Europe/Istanbul",
      count: scheduled.length,
      scheduled,
      approval: REQUIRED_APPROVAL,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Plugin üzerinden planlama başarısız." },
      { status: error?.status || 500 }
    );
  }
}
