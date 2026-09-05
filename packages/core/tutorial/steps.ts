import type { TutorialRole, TutorialStep, TutorialStepKey } from '../types/tutorial';

export const TUTORIAL_VERSION = 1;

const camel = (key: TutorialStepKey): string =>
  key.replace(/\.([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const copy = (
  role: TutorialRole,
  key: TutorialStepKey
): Pick<TutorialStep, 'titleKey' | 'bodyKey'> =>
  key === 'welcome'
    ? { titleKey: `tutorial.welcome.${role}.title`, bodyKey: `tutorial.welcome.${role}.body` }
    : {
        titleKey: `tutorial.steps.${role}.${camel(key)}.title`,
        bodyKey: `tutorial.steps.${role}.${camel(key)}.body`,
      };

const baristaStep = (step: Omit<TutorialStep, 'titleKey' | 'bodyKey'>): TutorialStep => ({
  ...step,
  ...copy('barista', step.key),
});

const businessStep = (step: Omit<TutorialStep, 'titleKey' | 'bodyKey'>): TutorialStep => ({
  ...step,
  ...copy('business', step.key),
});

export const BARISTA_STEPS: readonly TutorialStep[] = [
  baristaStep({ key: 'welcome', kind: 'info', mode: 'card' }),
  baristaStep({
    key: 'profile.open',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'profile.createCta',
    doneWhen: { route: ['profileSetup'] },
    autoDoneWhen: { fact: 'hasBaristaProfile' },
    showMeRoute: 'profile',
  }),
  baristaStep({
    key: 'profile.fill',
    kind: 'action',
    mode: 'hint',
    anchor: 'profile.wizardFooter',
    doneWhen: { fact: 'hasBaristaProfile' },
    autoDoneWhen: { fact: 'hasBaristaProfile' },
    showMeRoute: 'profileSetup',
  }),
  baristaStep({
    key: 'jobs.tab',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'tab.jobs',
    doneWhen: { route: ['jobFeed'] },
    showMeRoute: 'jobFeed',
  }),
  baristaStep({
    key: 'jobs.filters',
    kind: 'info',
    mode: 'spotlight',
    anchor: 'feed.filters',
    showMeRoute: 'jobFeed',
  }),
  baristaStep({
    key: 'jobs.open',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'feed.firstJob',
    doneWhen: { route: ['jobDetails'], anchorVisible: 'job.apply' },
    autoDoneWhen: { fact: 'hasApplication' },
    showMeRoute: 'jobFeed',
  }),
  baristaStep({
    key: 'jobs.apply',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'job.apply',
    doneWhen: { route: ['apply'] },
    autoDoneWhen: { fact: 'hasApplication' },
    showMeRoute: 'jobFeed',
  }),
  baristaStep({
    key: 'jobs.send',
    kind: 'action',
    mode: 'hint',
    anchor: 'apply.submit',
    doneWhen: { fact: 'hasApplication' },
    autoDoneWhen: { fact: 'hasApplication' },
    showMeRoute: 'jobFeed',
  }),
  baristaStep({
    key: 'applications.tab',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'tab.applications',
    doneWhen: { route: ['applications'] },
    showMeRoute: 'applications',
  }),
  baristaStep({
    key: 'chats.tab',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'tab.chats',
    doneWhen: { route: ['chats'] },
    showMeRoute: 'chats',
  }),
  baristaStep({
    key: 'notifications.bell',
    kind: 'info',
    mode: 'spotlight',
    anchor: 'header.bell',
    doneWhen: { route: ['notifications'] },
    showMeRoute: 'profile',
  }),
  baristaStep({
    key: 'settings.gear',
    kind: 'info',
    mode: 'spotlight',
    anchor: 'header.settings',
    doneWhen: { route: ['settings'] },
    showMeRoute: 'profile',
  }),
];

export const BUSINESS_STEPS: readonly TutorialStep[] = [
  businessStep({ key: 'welcome', kind: 'info', mode: 'card' }),
  businessStep({
    key: 'business.profile.open',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'business.createCta',
    doneWhen: { route: ['profileSetup'] },
    autoDoneWhen: { fact: 'hasBusiness' },
    showMeRoute: 'profile',
  }),
  businessStep({
    key: 'business.profile.fill',
    kind: 'action',
    mode: 'hint',
    anchor: 'business.wizardFooter',
    doneWhen: { fact: 'hasBusiness' },
    autoDoneWhen: { fact: 'hasBusiness' },
    showMeRoute: 'profileSetup',
  }),
  businessStep({
    key: 'business.branch',
    kind: 'action',
    mode: 'hint',
    anchor: 'branches.add',
    doneWhen: { fact: 'hasBranch' },
    autoDoneWhen: { fact: 'hasBranch' },
    showMeRoute: 'branches',
  }),
  businessStep({
    key: 'business.tab',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'tab.business',
    doneWhen: { route: ['businessHome'] },
    showMeRoute: 'businessHome',
  }),
  businessStep({
    key: 'business.tabs',
    kind: 'info',
    mode: 'spotlight',
    anchor: 'business.tabs',
    showMeRoute: 'businessHome',
  }),
  businessStep({
    key: 'job.create.open',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'business.addJob',
    doneWhen: { route: ['createJob'] },
    autoDoneWhen: { fact: 'hasJob' },
    showMeRoute: 'businessHome',
  }),
  businessStep({
    key: 'job.create.fill',
    kind: 'action',
    mode: 'hint',
    anchor: 'createJob.save',
    doneWhen: { fact: 'hasJob' },
    autoDoneWhen: { fact: 'hasJob' },
    showMeRoute: 'createJob',
  }),
  businessStep({
    key: 'baristas.tab',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'tab.baristas',
    doneWhen: { route: ['baristaFeed'] },
    showMeRoute: 'baristaFeed',
  }),
  businessStep({
    key: 'baristas.filters',
    kind: 'info',
    mode: 'spotlight',
    anchor: 'baristas.filters',
    showMeRoute: 'baristaFeed',
  }),
  businessStep({
    key: 'baristas.open',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'baristas.firstCard',
    doneWhen: { route: ['baristaProfile'] },
    autoDoneWhen: { fact: 'hasOffer' },
    showMeRoute: 'baristaFeed',
  }),
  businessStep({
    key: 'baristas.offer',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'barista.offer',
    doneWhen: { route: ['offerJob'] },
    autoDoneWhen: { fact: 'hasOffer' },
    showMeRoute: 'baristaFeed',
  }),
  businessStep({
    key: 'baristas.offer.send',
    kind: 'action',
    mode: 'hint',
    anchor: 'offer.jobs',
    doneWhen: { fact: 'hasOffer' },
    autoDoneWhen: { fact: 'hasOffer' },
    showMeRoute: 'baristaFeed',
  }),
  businessStep({
    key: 'applicants',
    kind: 'info',
    mode: 'spotlight',
    anchor: 'business.firstJob',
    doneWhen: { route: ['applicants'] },
    showMeRoute: 'businessHome',
  }),
  businessStep({
    key: 'chats.tab',
    kind: 'action',
    mode: 'spotlight',
    anchor: 'tab.chats',
    doneWhen: { route: ['chats'] },
    showMeRoute: 'chats',
  }),
  businessStep({
    key: 'notifications.bell',
    kind: 'info',
    mode: 'spotlight',
    anchor: 'header.bell',
    doneWhen: { route: ['notifications'] },
    showMeRoute: 'profile',
  }),
  businessStep({
    key: 'settings.gear',
    kind: 'info',
    mode: 'spotlight',
    anchor: 'header.settings',
    doneWhen: { route: ['settings'] },
    showMeRoute: 'profile',
  }),
];

export const stepsForRole = (role: TutorialRole): readonly TutorialStep[] =>
  role === 'business' ? BUSINESS_STEPS : BARISTA_STEPS;
