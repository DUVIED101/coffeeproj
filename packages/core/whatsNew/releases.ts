export type ReleaseNoteItem = {
  titleKey: string;
  bodyKey: string;
};

export type ReleaseNote = {
  // Bump together with the release that ships the notes; a device shows the
  // sheet once per id.
  id: string;
  // Users created after this moment installed fresh and never see the sheet.
  releasedAt: string;
  titleKey: string;
  items: readonly ReleaseNoteItem[];
};

const item = (release: string, key: string): ReleaseNoteItem => ({
  titleKey: `whatsNew.releases.${release}.items.${key}.title`,
  bodyKey: `whatsNew.releases.${release}.items.${key}.body`,
});

export const CURRENT_RELEASE: ReleaseNote = {
  id: '2026-09-06',
  releasedAt: '2026-09-06T00:00:00.000Z',
  titleKey: 'whatsNew.releases.r20260906.title',
  items: [
    item('r20260906', 'tutorial'),
    item('r20260906', 'employment'),
    item('r20260906', 'offers'),
  ],
};
