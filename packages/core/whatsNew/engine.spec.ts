import { resolveWhatsNew } from './engine';
import type { ReleaseNote } from './releases';

const release: ReleaseNote = {
  id: '2026-09-06',
  releasedAt: '2026-09-06T00:00:00.000Z',
  titleKey: 'whatsNew.releases.r20260906.title',
  items: [],
};
const BEFORE_RELEASE = '2026-08-01T12:00:00.000Z';
const AFTER_RELEASE = '2026-09-07T12:00:00.000Z';

describe('resolveWhatsNew', () => {
  it.each([
    {
      name: 'a device that already showed this release',
      lastSeenId: '2026-09-06',
      userCreatedAt: BEFORE_RELEASE,
      expected: 'none',
    },
    {
      name: 'a device that showed an older release',
      lastSeenId: '2026-07-01',
      userCreatedAt: BEFORE_RELEASE,
      expected: 'show',
    },
    {
      name: 'an existing user without a marker (first rollout or reinstall)',
      lastSeenId: null,
      userCreatedAt: BEFORE_RELEASE,
      expected: 'show',
    },
    {
      name: 'a fresh install by a user created after the release',
      lastSeenId: null,
      userCreatedAt: AFTER_RELEASE,
      expected: 'markSeen',
    },
    {
      name: 'an unparsable creation date',
      lastSeenId: null,
      userCreatedAt: 'unknown',
      expected: 'show',
    },
  ] as const)('returns $expected for $name', ({ lastSeenId, userCreatedAt, expected }) => {
    expect(resolveWhatsNew({ lastSeenId, release, userCreatedAt })).toBe(expected);
  });
});
