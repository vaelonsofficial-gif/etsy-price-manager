import { NextResponse } from "next/server";
import { GET as handleOAuthCallback } from "./callback/route";

export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("step") !== "callback") {
    return NextResponse.json({ error: "Geçersiz Etsy API adımı." }, { status: 400 });
  }
  return handleOAuthCallback(request);
}
