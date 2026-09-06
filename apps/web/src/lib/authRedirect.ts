// Where the social-auth flows land. Every provider ends on /auth/bootstrap
// (role + consent reconciliation) and every failure on /auth/login?error=.
export type LoginErrorCode = "oauth_failed" | "email_already_registered";

export const bootstrapPath = (next: string | null): string =>
  next ? `/auth/bootstrap?next=${encodeURIComponent(next)}` : "/auth/bootstrap";

export const loginErrorPath = (code: LoginErrorCode): string =>
  `/auth/login?error=${code}`;
