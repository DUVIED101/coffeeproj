import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";
import { signPayload, verifyPayload } from "@/lib/signedCookie";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Paths reachable without a session. Everything else redirects to /auth/login.
const PUBLIC_PATHS = [
  "/auth",
  "/about",
  "/terms",
  "/privacy",
  "/personal-data",
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = matchesAny(pathname, PUBLIC_PATHS);

  if (!user) {
    if (isPublic || pathname === "/") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search =
      pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
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
  if (profile && (profile.sub !== user.id || profile.exp <= Date.now()))
    profile = null;

  if (!profile) {
    const { data: row } = await supabase
      .from("users")
      .select("account_type, consent_accepted_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = {
      sub: user.id,
      accountType:
        row?.account_type === "barista" || row?.account_type === "business"
          ? row.account_type
          : null,
      hasConsent: !!row?.consent_accepted_at,
      exp: Date.now() + PROFILE_TTL_MS,
    };
    if (secret) {
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
