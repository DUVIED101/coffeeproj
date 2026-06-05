import i18next from 'i18next';

type Shape = { message?: unknown; code?: unknown; name?: unknown; status?: unknown };

const asShape = (e: unknown): Shape => (e && typeof e === 'object' ? (e as Shape) : {});

const t = (key: string): string => i18next.t(key);

export const mapAuthError = (error: unknown): string | null => {
  const { message } = asShape(error);
  if (typeof message !== 'string') return null;
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return t('errors.auth.invalidCredentials');
  if (m.includes('email not confirmed')) return t('errors.auth.emailNotConfirmed');
  if (m.includes('email rate limit') || m.includes('rate limit')) return t('errors.auth.rateLimit');
  if (m.includes('user already registered') || m.includes('already exists'))
    return t('errors.auth.userExists');
  if (m.includes('email link is invalid')) return t('errors.auth.linkInvalid');
  return null;
};

export const mapPostgrestError = (error: unknown): string | null => {
  const { code } = asShape(error);
  if (typeof code !== 'string') return null;
  switch (code) {
    case '23505':
      return t('errors.db.uniqueViolation');
    case '23503':
      return t('errors.db.foreignKey');
    case '42501':
      return t('errors.db.permission');
    case 'PGRST116':
      return t('errors.db.notFound');
    default:
      return null;
  }
};

export const mapNetworkError = (error: unknown): string | null => {
  const { message, name } = asShape(error);
  const m = typeof message === 'string' ? message.toLowerCase() : '';
  const n = typeof name === 'string' ? name : '';
  if (n === 'AbortError') return t('errors.network.aborted');
  if (n === 'TimeoutError' || m.includes('timeout') || m.includes('timed out'))
    return t('errors.network.timeout');
  if (
    m.includes('network request failed') ||
    m.includes('failed to fetch') ||
    m.includes('network error')
  )
    return t('errors.network.offline');
  return null;
};

export const mapAnyError = (error: unknown): string =>
  mapAuthError(error) ?? mapPostgrestError(error) ?? mapNetworkError(error) ?? t('errors.unknown');

export const isRetryableError = (error: unknown): boolean => {
  if (mapNetworkError(error)) return true;
  const { status, code } = asShape(error);
  if (typeof status === 'number' && status >= 500 && status < 600) return true;
  if (typeof code === 'string' && code.startsWith('PGRST') && code !== 'PGRST116') return true;
  return false;
};
