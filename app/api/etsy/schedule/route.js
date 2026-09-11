import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { scheduledEtsyPublishWorkflow } from "../../../../workflows/scheduled-etsy-publish";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("etsy_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Önce Etsy hesabını bağla." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const listingId = String(body?.listingId || "").trim();
    const publishAtMs = Date.parse(body?.publishAt || "");

    if (!/^\d+$/.test(listingId)) {
      return NextResponse.json({ error: "Geçerli bir listing seç." }, { status: 400 });
    }

    if (!Number.isFinite(publishAtMs)) {
      return NextResponse.json({ error: "Geçerli bir tarih ve saat seç." }, { status: 400 });
    }

    const now = Date.now();
    if (publishAtMs < now + 15000) {
      return NextResponse.json(
        { error: "Yayınlama zamanı en az 15 saniye ileride olmalı." },
        { status: 400 }
      );
    }

    const maxMs = now + 85 * 24 * 60 * 60 * 1000;
    if (publishAtMs > maxMs) {
      return NextResponse.json(
        { error: "Etsy token güvenliği için en fazla 85 gün ileri planlanabilir." },
        { status: 400 }
      );
    }

    const publishAt = new Date(publishAtMs).toISOString();
    const run = await start(scheduledEtsyPublishWorkflow, [
      { listingId, publishAt, refreshToken },
    ]);

    return NextResponse.json({
      ok: true,
      runId: run.runId,
      listingId,
      publishAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Planlama başarısız." },
      { status: 500 }
    );
  }
}
