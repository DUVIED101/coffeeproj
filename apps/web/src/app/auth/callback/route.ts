import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// PKCE code exchange for email-link flows and (Phase 7) Google OAuth via
// Supabase. Apple/Yandex get their own sub-routes when Phase 7 lands.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/auth/bootstrap", url.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/login", url.origin));
}
