import { NextResponse } from "next/server";

export function middleware(request) {
  const host = request.headers.get("host") || "";

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
  matcher: ["/papernexa/:path*"],
};
