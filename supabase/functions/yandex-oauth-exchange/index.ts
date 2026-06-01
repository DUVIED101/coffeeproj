// Yandex ID → Supabase session exchange.
//
// Yandex isn't a built-in Supabase OAuth provider. This function:
//   1. Verifies the Yandex access token via login.yandex.ru/info
//   2. Finds or creates the matching auth.users row by email
//   3. Issues a one-shot magic-link token_hash via admin.generateLink
//   4. Returns { token_hash, email } so the client can verifyOtp() locally
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

type YandexUserInfo = {
  id: string;
  default_email?: string;
  emails?: string[];
  display_name?: string;
  real_name?: string;
  first_name?: string;
  last_name?: string;
};

async function fetchYandexUser(accessToken: string): Promise<YandexUserInfo | null> {
  const resp = await fetch('https://login.yandex.ru/info?format=json', {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!resp.ok) return null;
  return (await resp.json()) as YandexUserInfo;
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<{
  id: string;
  email_confirmed_at: string | null;
  user_metadata_provider: string | null;
} | null> {
  // listUsers is paginated. With small user counts this is fine; switch to a
  // proper REST query against auth.users when the directory grows.
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (match) {
      const meta = (match.user_metadata ?? {}) as { provider?: string };
      return {
        id: match.id,
        email_confirmed_at: match.email_confirmed_at ?? null,
        user_metadata_provider: typeof meta.provider === 'string' ? meta.provider : null,
      };
    }
    if (data.users.length < perPage) return null;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: 'missing_service_config' });
  }

  let accessToken: string | undefined;
  try {
    const body = (await req.json()) as { accessToken?: string };
    accessToken = body.accessToken;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }
  if (!accessToken) {
    return jsonResponse(400, { error: 'missing_access_token' });
  }

  const yandexUser = await fetchYandexUser(accessToken);
  if (!yandexUser) {
    return jsonResponse(401, { error: 'yandex_token_invalid' });
  }
  const email = (yandexUser.default_email || yandexUser.emails?.[0] || '').toLowerCase();
  if (!email) {
    return jsonResponse(400, { error: 'no_email_from_yandex' });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const existing = await findUserByEmail(admin, email);
    if (!existing) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          provider: 'yandex',
          yandex_user_id: yandexUser.id,
          full_name: yandexUser.real_name ?? yandexUser.display_name ?? null,
        },
      });
      if (createErr) {
        return jsonResponse(500, { error: createErr.message });
      }
    } else {
      // Email-uniqueness across auth methods: only allow this email to flow
      // through Yandex if the account was originally created via Yandex.
      // Yandex-created users carry user_metadata.provider='yandex'; anything
      // else (email/password, Apple, Google) means the email is owned by a
      // different method and we refuse to silently link.
      if (existing.user_metadata_provider !== 'yandex') {
        return jsonResponse(409, { error: 'email_already_registered' });
      }
      if (!existing.email_confirmed_at) {
        await admin.auth.admin.updateUserById(existing.id, { email_confirm: true });
      }
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkErr || !linkData) {
      return jsonResponse(500, { error: linkErr?.message ?? 'link_generation_failed' });
    }

    const props = linkData.properties as { hashed_token?: string; action_link?: string };
    let tokenHash = props.hashed_token;
    if (!tokenHash && props.action_link) {
      const url = new URL(props.action_link);
      tokenHash = url.searchParams.get('token') ?? undefined;
    }
    if (!tokenHash) {
      return jsonResponse(500, { error: 'missing_token_hash' });
    }

    return jsonResponse(200, { token_hash: tokenHash, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return jsonResponse(500, { error: message });
  }
});
