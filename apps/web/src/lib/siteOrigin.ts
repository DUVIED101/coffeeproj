import type { NextRequest } from "next/server";

// Public origin of this deployment as the browser sees it. Vercel terminates
// TLS in front of the function, so the forwarded headers win over whatever
// Next parsed off the socket. Provider consoles compare redirect URIs
// string-exact, so this must match the registered callback origin.
export const siteOrigin = (request: NextRequest): string => {
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(/:$/, "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl.host;
  return `${proto}://${host}`;
};
