// Version identifiers for each legal document the user must accept.
// Bumping any value here invalidates prior acceptances of that document and
// forces every signed-in user back through the consent gate before the next
// session of the app (mobile ProfileBootstrapScreen, web /auth/bootstrap).
//
// Source of truth: the "Дата вступления в силу" / "Дата публикации" line at
// the top of each body in packages/core/legal/*.ts; legalVersions.spec.ts
// fails when they drift apart. The landing pages in
// admin/src/app/{terms,privacy,consent,personal-data}/page.tsx carry a
// hand-mirrored copy of the RU bodies and must be regenerated in the same
// change (see infra/supabase-selfhost/README.md → "Legal documents").
//
// 2026-09-15: backend moved from Supabase Cloud (Ireland) to a Timeweb server
// in Moscow; recipients of personal data changed, so all three documents were
// re-issued and re-acceptance is required.

export type LegalDocumentKind = "terms" | "privacy" | "data_consent";

export const LEGAL_DOCUMENT_KINDS: readonly LegalDocumentKind[] = [
  "terms",
  "privacy",
  "data_consent",
] as const;

export const LEGAL_DOCUMENT_VERSIONS: Record<LegalDocumentKind, string> = {
  terms: "2026-09-15",
  privacy: "2026-09-15",
  data_consent: "2026-09-15",
};
