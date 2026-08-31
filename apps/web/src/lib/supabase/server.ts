import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Server components / route handlers always hit Supabase directly — Vercel's
// edge isn't behind Russian ISP blocks, only browsers are.
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Pin the cookie name to the project-stable key the browser client
      // writes (see src/platform/storage.ts). Without this @supabase/ssr
      // derives the name from the URL's project ref, which breaks when the
      // browser talked to the RU proxy.
      cookieOptions: { name: STABLE_STORAGE_KEY },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes the session.
          }
        },
      },
    },
  );
}
