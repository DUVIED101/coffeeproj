import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { JWK } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";
import { signPayload, verifyPayload } from "@/lib/signedCookie";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Paths reachable without a session. Everything else redirects to /auth/login.
const PUBLIC_PATHS = [
  "/auth",
  "/terms",
  "/privacy",
  "/personal-data",
  "/data-consent",
  "/robots.txt",
  "/sitemap.xml",
];

// Role scoping mirrors mobile's MainTabs split. Shared paths (/jobs,
// /jobs/[id], /profile, /chats, /notifications, /settings, /disputes,
// /documents, /reviews) dispatch by accountType inside the page.
const BARISTA_ONLY = ["/applications", "/offers", "/shifts", "/businesses"];
const BUSINESS_ONLY = ["/dashboard", "/baristas", "/branches", "/shift-alerts"];

const PROFILE_COOKIE = "bb_profile";
const PROFILE_TTL_MS = 5 * 60 * 1000;

type ProfileCache = {
  sub: string;
  accountType: "barista" | "business" | null;
  hasConsent: boolean;
  exp: number;
};

const isProfileCache = (v: unknown): v is ProfileCache => {
  const p = v as ProfileCache | null;
  return (
    !!p &&
    typeof p.sub === "string" &&
    typeof p.hasConsent === "boolean" &&
    typeof p.exp === "number" &&
    (p.accountType === "barista" ||
      p.accountType === "business" ||
      p.accountType === null)
  );
};

const matchesAny = (pathname: string, prefixes: string[]): boolean =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// JWKS for local JWT verification, cached per edge isolate so a warm
// invocation verifies the session without any network call.
type Jwks = { keys: JWK[] };
const JWKS_TTL_MS = 10 * 60 * 1000;
// Supabase being slow must cost a page a couple of seconds, not the whole
// middleware budget.
const JWKS_FETCH_TIMEOUT_MS = 2500;
const CLAIMS_TIMEOUT_MS = 6000;
let jwksCache: { jwks: Jwks; fetchedAt: number } | null = null;

async function getJwks(): Promise<Jwks | undefined> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.jwks;
  }
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        signal: AbortSignal.timeout(JWKS_FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) return jwksCache?.jwks;
    const jwks = (await res.json()) as Jwks;
    if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) {
      return jwksCache?.jwks;
    }
    jwksCache = { jwks, fetchedAt: Date.now() };
    return jwks;
  } catch {
    return jwksCache?.jwks;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // The browser side is plain supabase-js over our own cookie storage
      // (src/platform/storage.ts), which expects JSON. @supabase/ssr defaults
      // to writing "base64-…" values, which that storage cannot parse — every
      // server-side session write (OAuth callbacks, token refresh in the
      // middleware) silently logged the browser out. Keep the wire format raw.
      cookieEncoding: "raw",
      cookieOptions: { name: STABLE_STORAGE_KEY },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Local JWT verification (ES256 signing keys) instead of a GoTrue round
  // trip on every request: when Supabase was slow this timed the whole
  // middleware out (MIDDLEWARE_INVOCATION_TIMEOUT, 2026-09-07). An expiring
  // session is still refreshed over the network before verification.
  // No session cookie at all → signed out, and nothing to verify or fetch.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith(STABLE_STORAGE_KEY));
  let userId: string | null = null;
  if (hasSessionCookie) {
    const verify = async (): Promise<string | null> => {
      const { data } = await supabase.auth.getClaims(undefined, {
        jwks: await getJwks(),
      });
      return data?.claims.sub ?? null;
    };
    const giveUp = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), CLAIMS_TIMEOUT_MS),
    );
    userId = await Promise.race([verify().catch(() => null), giveUp]);
  }

  const isPublic = matchesAny(pathname, PUBLIC_PATHS);

  if (!userId) {
    if (isPublic || pathname === "/") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search =
      pathname === "/"
        ? ""
        : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // Authed users bounced off auth screens (except bootstrap/callback, which
  // legitimately run with a live session).
  if (
    pathname.startsWith("/auth") &&
    !pathname.startsWith("/auth/bootstrap") &&
    !pathname.startsWith("/auth/callback")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Profile lookup with an HMAC-signed 5-minute cache cookie so we don't hit
  // public.users on every request (same trick as the admin panel's is_admin).
  const secret = process.env.BB_PROFILE_COOKIE_SECRET;
  const cachedRaw = request.cookies.get(PROFILE_COOKIE)?.value;
  let profile: ProfileCache | null =
    secret && cachedRaw
      ? await verifyPayload(cachedRaw, secret, isProfileCache)
      : null;
  if (profile && (profile.sub !== userId || profile.exp <= Date.now()))
    profile = null;
  // Never trust a cached INCOMPLETE profile: bootstrap is about to change
  // exactly these fields, and a stale hasConsent=false would bounce the user
  // between /auth/bootstrap and the app until the TTL expired. Incomplete
  // states re-query on every request — they live for seconds, not minutes.
  if (profile && (!profile.accountType || !profile.hasConsent)) profile = null;

  if (!profile) {
    const { data: row } = await supabase
      .from("users")
      .select("account_type, consent_accepted_at")
      .eq("id", userId)
      .maybeSingle();
    profile = {
      sub: userId,
      accountType:
        row?.account_type === "barista" || row?.account_type === "business"
          ? row.account_type
          : null,
      hasConsent: !!row?.consent_accepted_at,
      exp: Date.now() + PROFILE_TTL_MS,
    };
    const complete = !!profile.accountType && profile.hasConsent;
    if (secret && complete) {
      response.cookies.set(PROFILE_COOKIE, await signPayload(profile, secret), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: PROFILE_TTL_MS / 1000,
      });
    }
  }

  // No profile row / no consent yet → finish onboarding first. Marketing
  // pages stay reachable (user may want to read the terms mid-signup).
  const needsBootstrap = !profile.accountType || !profile.hasConsent;
  if (needsBootstrap && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/bootstrap";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
    profile.accountType === "business" &&
    matchesAny(pathname, BARISTA_ONLY)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (
    profile.accountType === "barista" &&
    matchesAny(pathname, BUSINESS_ONLY)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/jobs";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Everything except Next internals, static assets, and files with extensions.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\..*).*)"],
};
