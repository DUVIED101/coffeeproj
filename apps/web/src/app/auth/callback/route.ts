import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { safeInternalPath } from "@bystrobarista/core/utils/safePath";
import { bootstrapPath, loginErrorPath } from "@/lib/authRedirect";
import { siteOrigin } from "@/lib/siteOrigin";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

// Mobile parity (AuthService.rejectIfCrossProvider): identities come back in
// creation order, so the first one owns the email. A Google sign-in that
// merely attached a new identity to an email/Apple account is refused.
const ownedByOtherProvider = (user: User, expected: string): boolean => {
  const original = user.identities?.[0]?.provider;
  return !!original && original !== expected;
};

// PKCE code exchange: Supabase-hosted OAuth (Google) and email links land
// here with ?code=. Apple (popup, no redirect) and Yandex (own callback under
// /auth/callback/yandex) don't come through this route.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = siteOrigin(request);
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const provider = params.get("provider");
  const next = safeInternalPath(params.get("next"));

  if (!code) {
    const target = params.get("error")
      ? loginErrorPath("oauth_failed")
      : "/auth/login";
    return NextResponse.redirect(new URL(target, origin));
  }

  const response = NextResponse.redirect(new URL(bootstrapPath(next), origin));
  const supabase = createSupabaseRouteClient(request, response);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.warn("exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(
      new URL(loginErrorPath("oauth_failed"), origin),
    );
  }
  if (provider && ownedByOtherProvider(data.user, provider)) {
    // Revoke server-side. The session cookies only exist on `response`, which
    // is not returned, so the browser never receives them.
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(loginErrorPath("email_already_registered"), origin),
    );
  }
  return response;
}
