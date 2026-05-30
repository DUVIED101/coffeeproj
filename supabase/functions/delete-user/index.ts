import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

type Brand<T, B> = T & { readonly __brand: B };
type UserId = Brand<string, "UserId">;

type AccountType = "barista" | "business";

type DeleteAccountRequest =
  | { password: string; force?: boolean }
  | { otpCode: string; force?: boolean }
  | { appleIdToken: string; force?: boolean };

const ACTIVE_JOB_STATUSES = ["open", "in_review"] as const;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APPLE_BUNDLE_ID =
  Deno.env.get("APPLE_BUNDLE_ID") ?? "com.quickbarista.app";

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

function isDeleteAccountRequest(value: unknown): value is DeleteAccountRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const hasPassword =
    typeof v.password === "string" && (v.password as string).length > 0;
  const hasOtpCode =
    typeof v.otpCode === "string" && (v.otpCode as string).length > 0;
  const hasAppleIdToken =
    typeof v.appleIdToken === "string" && (v.appleIdToken as string).length > 0;
  if (!hasPassword && !hasOtpCode && !hasAppleIdToken) return false;
  if (v.force !== undefined && typeof v.force !== "boolean") return false;
  return true;
}

async function appleSubFromIdToken(idToken: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: APPLE_BUNDLE_ID,
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch (err) {
    console.warn("apple id_token verify failed", { err: String(err) });
    return null;
  }
}

async function userAppleSub(
  adminClient: SupabaseClient,
  userId: UserId,
): Promise<string | null> {
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  const identities = data.user.identities ?? [];
  const apple = identities.find((i) => i.provider === "apple");
  if (!apple) return null;
  const fromProviderId =
    typeof apple.provider_id === "string" && apple.provider_id.length > 0
      ? apple.provider_id
      : null;
  if (fromProviderId) return fromProviderId;
  const idData = apple.identity_data as Record<string, unknown> | undefined;
  const fromIdentityData =
    idData && typeof idData.sub === "string" ? (idData.sub as string) : null;
  return fromIdentityData;
}

function extractBearerToken(authHeader: string): string | null {
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return null;
  const token = authHeader.slice(prefix.length).trim();
  return token.length > 0 ? token : null;
}

async function countActiveBusinessJobs(
  supabase: SupabaseClient,
  ownerId: UserId,
): Promise<number> {
  const { count, error } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("business_owner_id", ownerId)
    .in("status", ACTIVE_JOB_STATUSES as unknown as string[]);
  if (error) throw new Error(`jobs count failed: ${error.message}`);
  return count ?? 0;
}

async function loadAccountType(
  supabase: SupabaseClient,
  userId: UserId,
): Promise<AccountType | null> {
  const { data, error } = await supabase
    .from("users")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`users lookup failed: ${error.message}`);
  if (data === null) return null;
  const row = data as { account_type: unknown };
  if (row.account_type !== "barista" && row.account_type !== "business") {
    return null;
  }
  return row.account_type;
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "supabase_not_configured" });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = extractBearerToken(authHeader);
  if (jwt === null) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }
  if (!isDeleteAccountRequest(parsed)) {
    return jsonResponse(400, { error: "invalid_request" });
  }
  const request = parsed;

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();
  if (userError || user === null) {
    return jsonResponse(401, { error: "unauthorized" });
  }
  const userId = user.id as UserId;
  const email = user.email ?? null;

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if ("password" in request) {
    if (email === null) {
      return jsonResponse(400, { error: "missing_email" });
    }
    const { error: reauthError } = await authClient.auth.signInWithPassword({
      email,
      password: request.password,
    });
    if (reauthError !== null) {
      return jsonResponse(403, { error: "invalid_password" });
    }
  } else if ("otpCode" in request) {
    // OTP path — used by accounts created via OAuth (Yandex/Google) that have
    // no password. The client called supabase.auth.signInWithOtp({email})
    // up-front, the user pasted the emailed 6-digit token, and we verify it
    // server-side here. verifyOtp confirms email ownership before destructive
    // delete proceeds. Not used for Apple — privaterelay aliases can't
    // receive our OTP mail; Apple users go through the appleIdToken branch.
    if (email === null) {
      return jsonResponse(400, { error: "missing_email" });
    }
    const { error: verifyError } = await authClient.auth.verifyOtp({
      email,
      token: request.otpCode,
      type: "email",
    });
    if (verifyError !== null) {
      return jsonResponse(403, { error: "invalid_otp" });
    }
  } else {
    // Apple SIWA re-auth path. The client just obtained a fresh identityToken
    // via appleAuth.performRequest. Apple's JWT signature + sub equality with
    // the stored Apple identity proves ownership; we skip nonce comparison
    // because the signature is already authoritative for this single-use
    // delete confirmation.
    const tokenSub = await appleSubFromIdToken(request.appleIdToken);
    if (tokenSub === null) {
      return jsonResponse(403, { error: "invalid_apple_token" });
    }
    const storedSub = await userAppleSub(adminClient, userId);
    if (storedSub === null || storedSub !== tokenSub) {
      return jsonResponse(403, { error: "invalid_apple_token" });
    }
  }

  let accountType: AccountType | null;
  try {
    accountType = await loadAccountType(authClient, userId);
  } catch (err) {
    console.warn("loadAccountType failed", { err: String(err) });
    return jsonResponse(500, { error: "lookup_failed" });
  }
  if (accountType === null) {
    return jsonResponse(404, { error: "user_not_found" });
  }

  if (accountType === "business") {
    let activeJobs: number;
    try {
      activeJobs = await countActiveBusinessJobs(authClient, userId);
    } catch (err) {
      console.warn("countActiveBusinessJobs failed", { err: String(err) });
      return jsonResponse(500, { error: "lookup_failed" });
    }
    if (activeJobs > 0 && request.force !== true) {
      return jsonResponse(409, { error: "active_jobs", count: activeJobs });
    }
  }

  const { error: dbDeleteError } = await adminClient
    .from("users")
    .delete()
    .eq("id", userId);
  if (dbDeleteError !== null) {
    console.warn("users delete failed", { message: dbDeleteError.message });
    return jsonResponse(500, { error: "db_delete_failed" });
  }

  const cascadeReport = await verifyCascade(adminClient, userId);
  const orphanTotal = Object.values(cascadeReport).reduce((s, n) => s + n, 0);
  if (orphanTotal > 0) {
    console.warn("cascade verification found orphans", {
      userId,
      cascadeReport,
    });
    return jsonResponse(500, {
      error: "cascade_incomplete",
      orphans: cascadeReport,
    });
  }

  const { error: authDeleteError } =
    await adminClient.auth.admin.deleteUser(userId);
  if (authDeleteError !== null) {
    console.warn("auth delete failed", { message: authDeleteError.message });
    return jsonResponse(500, { error: "auth_delete_failed" });
  }

  return jsonResponse(200, { ok: true, deleted: cascadeReport });
}

type CascadeReport = {
  applications: number;
  jobs: number;
  businesses: number;
  conversations_as_barista: number;
  conversations_as_business: number;
  messages: number;
  barista_profiles: number;
  apns_tokens: number;
  notification_preferences: number;
};

async function countRows(
  supabase: SupabaseClient,
  table: string,
  column: string,
  userId: UserId,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, userId);
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

async function verifyCascade(
  supabase: SupabaseClient,
  userId: UserId,
): Promise<CascadeReport> {
  const [
    applications,
    jobs,
    businesses,
    conversationsAsBarista,
    conversationsAsBusiness,
    messages,
    baristaProfiles,
    apnsTokens,
    notificationPrefs,
  ] = await Promise.all([
    countRows(supabase, "applications", "barista_id", userId),
    countRows(supabase, "jobs", "business_owner_id", userId),
    countRows(supabase, "businesses", "owner_id", userId),
    countRows(supabase, "conversations", "barista_id", userId),
    countRows(supabase, "conversations", "business_id", userId),
    countRows(supabase, "messages", "sender_id", userId),
    countRows(supabase, "barista_profiles", "user_id", userId),
    countRows(supabase, "apns_tokens", "user_id", userId),
    countRows(supabase, "notification_preferences", "user_id", userId),
  ]);
  return {
    applications,
    jobs,
    businesses,
    conversations_as_barista: conversationsAsBarista,
    conversations_as_business: conversationsAsBusiness,
    messages,
    barista_profiles: baristaProfiles,
    apns_tokens: apnsTokens,
    notification_preferences: notificationPrefs,
  };
}

Deno.serve(handleRequest);
