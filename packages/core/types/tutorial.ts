import type { UserId } from './ids';
import type { AccountType } from './user';

export type TutorialRole = AccountType;

export type TutorialStepStatus = 'done' | 'skipped';
export type TutorialStepMode = 'card' | 'spotlight' | 'hint';
export type TutorialStepKind = 'info' | 'action';

export type TutorialFacts = {
  hasBaristaProfile: boolean;
  profileCompleteness: number;
  hasApplication: boolean;
  hasBusiness: boolean;
  hasBranch: boolean;
  hasJob: boolean;
  hasOffer: boolean;
  hasConversation: boolean;
};

export type TutorialFactKey = Exclude<keyof TutorialFacts, 'profileCompleteness'>;

export type TutorialRouteKey =
  | 'profile'
  | 'profileSetup'
  | 'jobFeed'
  | 'jobDetails'
  | 'apply'
  | 'applications'
  | 'chats'
  | 'notifications'
  | 'settings'
  | 'businessHome'
  | 'createJob'
  | 'branches'
  | 'baristaFeed'
  | 'baristaProfile'
  | 'offerJob'
  | 'applicants'
  | 'other';

export type TutorialAnchorKey =
  | 'tab.profile'
  | 'tab.jobs'
  | 'tab.applications'
  | 'tab.business'
  | 'tab.baristas'
  | 'tab.chats'
  | 'header.bell'
  | 'header.settings'
  | 'profile.createCta'
  | 'profile.wizardFooter'
  | 'feed.filters'
  | 'feed.firstJob'
  | 'job.apply'
  | 'apply.submit'
  | 'business.createCta'
  | 'business.wizardFooter'
  | 'branches.add'
  | 'business.tabs'
  | 'business.addJob'
  | 'business.firstJob'
  | 'createJob.save'
  | 'baristas.filters'
  | 'baristas.firstCard'
  | 'barista.offer'
  | 'offer.jobs';

export type BaristaTutorialStepKey =
  | 'welcome'
  | 'profile.open'
  | 'profile.fill'
  | 'jobs.tab'
  | 'jobs.filters'
  | 'jobs.open'
  | 'jobs.apply'
  | 'jobs.send'
  | 'applications.tab'
  | 'chats.tab'
  | 'notifications.bell'
  | 'settings.gear';

export type BusinessTutorialStepKey =
  | 'welcome'
  | 'business.profile.open'
  | 'business.profile.fill'
  | 'business.branch'
  | 'business.tab'
  | 'business.tabs'
  | 'job.create.open'
  | 'job.create.fill'
  | 'baristas.tab'
  | 'baristas.filters'
  | 'baristas.open'
  | 'baristas.offer'
  | 'baristas.offer.send'
  | 'applicants'
  | 'chats.tab'
  | 'notifications.bell'
  | 'settings.gear';

export type TutorialStepKey = BaristaTutorialStepKey | BusinessTutorialStepKey;

/** Conditions are OR-ed: any satisfied condition closes the step. */
export type TutorialDoneCondition = {
  fact?: TutorialFactKey;
  route?: readonly TutorialRouteKey[];
  anchorVisible?: TutorialAnchorKey;
};

export type TutorialStep = {
  key: TutorialStepKey;
  kind: TutorialStepKind;
  mode: TutorialStepMode;
  anchor?: TutorialAnchorKey;
  titleKey: string;
  bodyKey: string;
  doneWhen?: TutorialDoneCondition;
  autoDoneWhen?: { fact: TutorialFactKey };
  showMeRoute?: TutorialRouteKey;
};

export type TutorialStepRecord = {
  status: TutorialStepStatus;
  at: string;
  auto?: true;
};

export type TutorialStepsMap = Partial<Record<TutorialStepKey, TutorialStepRecord>>;

export type TutorialProgress = {
  userId: UserId;
  accountType: TutorialRole;
  version: number;
  steps: TutorialStepsMap;
  completedAt: string | null;
  skippedAllAt: string | null;
  replayHintShownAt: string | null;
};

export type TutorialProgressPatch = Partial<
  Pick<TutorialProgress, 'steps' | 'completedAt' | 'skippedAllAt' | 'replayHintShownAt' | 'version'>
>;
