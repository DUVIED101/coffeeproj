import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { APP_VERSION } from '../config/version';
import {
  LEGAL_DOCUMENT_KINDS,
  LEGAL_DOCUMENT_VERSIONS,
  type LegalDocumentKind,
} from '../config/legalVersions';
import type { UserId } from '../types/ids';

type AcceptanceRow = {
  document_kind: LegalDocumentKind;
  document_version: string;
};

const buildUserAgent = (): string =>
  `BystroBarista/${APP_VERSION} ${Platform.OS}/${Platform.Version}`;

const targetVersions = (): AcceptanceRow[] =>
  LEGAL_DOCUMENT_KINDS.map(kind => ({
    document_kind: kind,
    document_version: LEGAL_DOCUMENT_VERSIONS[kind],
  }));

/**
 * Insert one row per (user, document_kind, document_version) for the
 * currently-published versions of Terms, Privacy and the Data-processing
 * consent. Idempotent — a row whose (user, kind, version) triple already
 * exists is silently skipped (we use ON CONFLICT DO NOTHING via upsert).
 *
 * The DB trigger fills `ip` from x-forwarded-for. `user_agent` and
 * `app_version` are best-effort; we send whatever the client knows.
 */
export const recordCurrentLegalAcceptances = async (userId: UserId): Promise<void> => {
  const userAgent = buildUserAgent();
  const rows = targetVersions().map(row => ({
    user_id: userId,
    document_kind: row.document_kind,
    document_version: row.document_version,
    user_agent: userAgent,
    app_version: APP_VERSION,
  }));

  const { error } = await supabase
    .from('legal_acceptances')
    .upsert(rows, { onConflict: 'user_id,document_kind,document_version', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
};

/**
 * Return the document kinds whose current published version the user has
 * NOT yet accepted. Used by ProfileBootstrap to decide whether to show the
 * re-consent gate after a Terms / Privacy / Consent bump.
 */
export const getOutstandingLegalAcceptances = async (
  userId: UserId
): Promise<LegalDocumentKind[]> => {
  const wanted = targetVersions();
  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('document_kind, document_version')
    .eq('user_id', userId)
    .in(
      'document_kind',
      wanted.map(row => row.document_kind)
    );
  if (error) throw new Error(error.message);

  const accepted = new Set((data ?? []).map(row => `${row.document_kind}@${row.document_version}`));
  return wanted
    .filter(row => !accepted.has(`${row.document_kind}@${row.document_version}`))
    .map(row => row.document_kind);
};
