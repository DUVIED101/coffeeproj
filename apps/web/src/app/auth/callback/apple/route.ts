import { NextResponse, type NextRequest } from "next/server";
import { loginErrorPath } from "@/lib/authRedirect";
import { siteOrigin } from "@/lib/siteOrigin";

// Registered as the Services ID Return URL. The web flow runs Sign in with
// Apple JS in popup mode, which hands the id_token straight to the page, so
// a real form_post here means the popup path was bypassed — bounce back to
// login instead of 405-ing on Apple's cross-site POST.
const backToLogin = (request: NextRequest): NextResponse =>
  NextResponse.redirect(
    new URL(loginErrorPath("oauth_failed"), siteOrigin(request)),
    303,
  );

export async function POST(request: NextRequest): Promise<NextResponse> {
  return backToLogin(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return backToLogin(request);
}
