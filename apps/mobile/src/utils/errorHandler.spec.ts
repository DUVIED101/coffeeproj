import {
  mapAuthError,
  mapPostgrestError,
  mapNetworkError,
  mapAnyError,
  isRetryableError,
} from './errorHandler';

jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

describe('mapAuthError', () => {
  it.each([
    [{ message: 'Invalid login credentials' }, 'errors.auth.invalidCredentials'],
    [{ message: 'Email not confirmed' }, 'errors.auth.emailNotConfirmed'],
    [{ message: 'Email rate limit exceeded' }, 'errors.auth.rateLimit'],
    [{ message: 'User already registered' }, 'errors.auth.userExists'],
    [{ message: 'Email link is invalid or has expired' }, 'errors.auth.linkInvalid'],
  ])('maps "%s"', (input, expected) => {
    expect(mapAuthError(input)).toBe(expected);
  });

  it.each([null, undefined, {}, { message: 42 }, { message: 'random' }])(
    'returns null for unmatched %p',
    input => {
      expect(mapAuthError(input)).toBeNull();
    }
  );
});

describe('mapPostgrestError', () => {
  it.each([
    [{ code: '23505' }, 'errors.db.uniqueViolation'],
    [{ code: '23503' }, 'errors.db.foreignKey'],
    [{ code: '42501' }, 'errors.db.permission'],
    [{ code: 'PGRST116' }, 'errors.db.notFound'],
  ])('maps code %s', (input, expected) => {
    expect(mapPostgrestError(input)).toBe(expected);
  });

  it.each([null, undefined, {}, { code: '99999' }])('returns null for %p', input => {
    expect(mapPostgrestError(input)).toBeNull();
  });
});

describe('mapNetworkError', () => {
  it.each([
    [{ message: 'Network request failed' }, 'errors.network.offline'],
    [{ message: 'Failed to fetch' }, 'errors.network.offline'],
    [{ message: 'Request timed out' }, 'errors.network.timeout'],
    [{ name: 'AbortError', message: '' }, 'errors.network.aborted'],
    [{ name: 'TimeoutError', message: '' }, 'errors.network.timeout'],
  ])('maps %p', (input, expected) => {
    expect(mapNetworkError(input)).toBe(expected);
  });

  it('returns null for non-network', () => {
    expect(mapNetworkError({ message: 'random thing' })).toBeNull();
  });
});

describe('mapAnyError', () => {
  it('falls back to unknown when nothing matches', () => {
    expect(mapAnyError({ message: 'totally unrelated' })).toBe('errors.unknown');
  });

  it('prefers auth over fallback', () => {
    expect(mapAnyError({ message: 'Invalid login credentials' })).toBe(
      'errors.auth.invalidCredentials'
    );
  });

  it('handles raw Error', () => {
    expect(mapAnyError(new Error('Network request failed'))).toBe('errors.network.offline');
  });
});

describe('isRetryableError', () => {
  it.each([
    [{ message: 'Network request failed' }, true],
    [{ status: 502 }, true],
    [{ status: 200 }, false],
    [{ code: 'PGRST500' }, true],
    [{ code: 'PGRST116' }, false],
    [{ message: 'Invalid login credentials' }, false],
  ])('classifies %p as retryable=%p', (input, expected) => {
    expect(isRetryableError(input)).toBe(expected);
  });
});
