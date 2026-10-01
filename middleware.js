import { NextResponse } from "next/server";

const CANONICAL_ORIGIN = "https://etsy-price-manager.vercel.app";

export function middleware(request) {
  const host = request.headers.get("host") || "";

  if (host.includes("onrender.com")) {
    const url = request.nextUrl.clone();
    const target = new URL(CANONICAL_ORIGIN);
    url.protocol = target.protocol;
    url.host = target.host;
    return NextResponse.redirect(url, 308);
  }

  if (
    host.startsWith("etsy-price-manager-s4aj") &&
    request.nextUrl.pathname.startsWith("/papernexa")
  ) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "etsy-price-manager.vercel.app";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
