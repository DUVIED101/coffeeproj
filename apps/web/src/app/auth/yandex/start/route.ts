import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@bystrobarista/core/utils/safePath";
import { loginErrorPath } from "@/lib/authRedirect";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_MS,
  signOAuthState,
} from "@/lib/oauthState";
import { randomToken, sha256Base64Url } from "@/lib/random";
import { siteOrigin } from "@/lib/siteOrigin";

const YANDEX_AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";
// Same scopes as mobile's YANDEX_CONFIG — the exchange function needs the
// default_email that login:email exposes.
const YANDEX_SCOPES = "login:email login:info";

// First half of the Yandex code flow. Mints state + PKCE verifier into a
// signed HTTP-only cookie (10 min) and sends the browser to Yandex; the
// registered callback is /auth/callback/yandex on this same origin.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = siteOrigin(request);
  const clientId = process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID;
  const secret = process.env.BB_PROFILE_COOKIE_SECRET;
  if (!clientId || !secret) {
    console.warn(
      "yandex start: NEXT_PUBLIC_YANDEX_CLIENT_ID or BB_PROFILE_COOKIE_SECRET missing",
    );
    return NextResponse.redirect(
      new URL(loginErrorPath("oauth_failed"), origin),
    );
  }

  const state = randomToken(32);
  const verifier = randomToken(48);
  const authorize = new URL(YANDEX_AUTHORIZE_URL);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", `${origin}/auth/callback/yandex`);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("scope", YANDEX_SCOPES);
  authorize.searchParams.set("code_challenge", await sha256Base64Url(verifier));
  authorize.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorize);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    await signOAuthState(
      {
        provider: "yandex",
        state,
        verifier,
        next: safeInternalPath(request.nextUrl.searchParams.get("next")),
        exp: Date.now() + OAUTH_STATE_TTL_MS,
      },
      secret,
    ),
    {
      httpOnly: true,
      secure: origin.startsWith("https:"),
      sameSite: "lax",
      path: "/auth",
      maxAge: OAUTH_STATE_TTL_MS / 1000,
    },
  );
  return response;
}
