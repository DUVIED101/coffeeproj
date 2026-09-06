import type { ReleaseNote } from './releases';

// show: first launch after an update (or an existing user without a marker);
// markSeen: fresh install by a new user — remember the release silently;
// none: this release was already shown on this device.
export type WhatsNewDecision = 'show' | 'markSeen' | 'none';

export type WhatsNewInput = {
  lastSeenId: string | null;
  release: ReleaseNote;
  userCreatedAt: string;
};

export const resolveWhatsNew = ({
  lastSeenId,
  release,
  userCreatedAt,
}: WhatsNewInput): WhatsNewDecision => {
  if (lastSeenId === release.id) return 'none';
  if (lastSeenId !== null) return 'show';
  const createdAt = Date.parse(userCreatedAt);
  const releasedAt = Date.parse(release.releasedAt);
  const isNewUser = !Number.isNaN(createdAt) && createdAt >= releasedAt;
  return isNewUser ? 'markSeen' : 'show';
};
