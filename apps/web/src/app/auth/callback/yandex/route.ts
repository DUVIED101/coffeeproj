import { NextResponse, type NextRequest } from "next/server";
import {
  bootstrapPath,
  loginErrorPath,
  type LoginErrorCode,
} from "@/lib/authRedirect";
import { OAUTH_STATE_COOKIE, readOAuthState } from "@/lib/oauthState";
import { siteOrigin } from "@/lib/siteOrigin";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token";

const clearStateCookie = (response: NextResponse): NextResponse => {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/auth", maxAge: 0 });
  return response;
};

// Second half of the Yandex code flow (see /auth/yandex/start). Yandex isn't
// a Supabase provider: the code becomes a Yandex access token here (PKCE —
// the same public-client exchange mobile does; YANDEX_CLIENT_SECRET is only
// added when set), the token becomes a magic-link token_hash through the
// yandex-oauth-exchange Edge Function, and verifyOtp turns that into session
// cookies on the redirect to /auth/bootstrap.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = siteOrigin(request);
  const fail = (code: LoginErrorCode, reason: string): NextResponse => {
    console.warn(`yandex callback failed: ${reason}`);
    return clearStateCookie(
      NextResponse.redirect(new URL(loginErrorPath(code), origin)),
    );
  };

  const clientId = process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID;
  const stored = await readOAuthState(
    request.cookies.get(OAUTH_STATE_COOKIE)?.value,
    process.env.BB_PROFILE_COOKIE_SECRET,
  );
  if (!clientId || !stored) {
    return fail("oauth_failed", "missing config or state cookie");
  }

  const params = request.nextUrl.searchParams;
  const providerError = params.get("error");
  if (providerError) return fail("oauth_failed", `provider ${providerError}`);
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || state !== stored.state) {
    return fail("oauth_failed", "state mismatch");
  }

  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    code_verifier: stored.verifier,
  });
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  if (clientSecret) form.set("client_secret", clientSecret);
  const tokenRes = await fetch(YANDEX_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const token = (await tokenRes.json().catch(() => null)) as {
    access_token?: string;
    error?: string;
  } | null;
  if (!tokenRes.ok || !token?.access_token) {
    return fail(
      "oauth_failed",
      `token exchange ${tokenRes.status} ${token?.error ?? ""}`,
    );
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const exchangeRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/yandex-oauth-exchange`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ accessToken: token.access_token }),
    },
  );
  const exchange = (await exchangeRes.json().catch(() => null)) as {
    token_hash?: string;
    error?: string;
  } | null;
  if (exchangeRes.status === 409) {
    return fail("email_already_registered", "email owned by another provider");
  }
  if (!exchangeRes.ok || !exchange?.token_hash) {
    return fail(
      "oauth_failed",
      `exchange ${exchangeRes.status} ${exchange?.error ?? ""}`,
    );
  }

  const response = clearStateCookie(
    NextResponse.redirect(new URL(bootstrapPath(stored.next), origin)),
  );
  const supabase = createSupabaseRouteClient(request, response);
  const { error } = await supabase.auth.verifyOtp({
    token_hash: exchange.token_hash,
    type: "magiclink",
  });
  if (error) return fail("oauth_failed", `verifyOtp ${error.message}`);
  return response;
}
