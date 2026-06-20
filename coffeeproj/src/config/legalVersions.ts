// Version identifiers for each legal document the user must accept.
// Bumping any value here invalidates prior acceptances of that document and
// forces every signed-in user back through the consent gate before the next
// session of the app.
//
// Source of truth: the "Дата вступления в силу" / "Дата публикации" line at
// the top of each in-app screen and the matching page on bystrobarista.com.
// Keep this file in sync with the body of:
//   src/screens/settings/TermsScreen.tsx
//   src/screens/settings/PrivacyPolicyScreen.tsx
//   src/screens/settings/DataConsentScreen.tsx
// and with admin/src/app/{terms,privacy}/page.tsx.

export type LegalDocumentKind = 'terms' | 'privacy' | 'data_consent';

export const LEGAL_DOCUMENT_KINDS: readonly LegalDocumentKind[] = [
  'terms',
  'privacy',
  'data_consent',
] as const;

export const LEGAL_DOCUMENT_VERSIONS: Record<LegalDocumentKind, string> = {
  terms: '2026-06-19',
  privacy: '2026-06-12',
  data_consent: '2026-06-12',
};
