import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Route-handler client bound to an explicit response: session cookies land
// on the redirect we return, without relying on cookies().set() being merged
// into it. Same cookie-name pinning as server.ts / middleware.
export function createSupabaseRouteClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: STABLE_STORAGE_KEY },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
}
