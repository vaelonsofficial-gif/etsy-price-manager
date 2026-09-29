import { NextResponse } from "next/server";

export function middleware(request) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  if (
    host.startsWith("etsy-price-manager-s4aj") &&
    pathname.startsWith("/papernexa")
  ) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "etsy-price-manager.vercel.app";
    return NextResponse.redirect(url, 308);
  }

  const isCanonical = host === "etsy-price-manager.vercel.app";
  const forceReconnect = request.nextUrl.searchParams.get("reconnect") === "1";
  const hasPaperNexaSession = Boolean(
    request.cookies.get("papernexa_refresh_token")?.value ||
    request.cookies.get("etsy_refresh_token")?.value
  );

  if (
    isCanonical &&
    pathname === "/papernexa" &&
    (forceReconnect || !hasPaperNexaSession)
  ) {
    const loginUrl = new URL("/api/papernexa/login", request.url);
    return NextResponse.redirect(loginUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/papernexa/:path*"],
};
