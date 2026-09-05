import type { TutorialRouteKey } from "@bystrobarista/core/types/tutorial";

const ROUTE_PATTERNS: ReadonlyArray<readonly [RegExp, TutorialRouteKey]> = [
  [/^\/jobs\/new$/, "createJob"],
  [/^\/jobs\/[^/]+\/apply$/, "apply"],
  [/^\/jobs\/[^/]+\/applicants$/, "applicants"],
  [/^\/jobs\/[^/]+\/edit$/, "other"],
  [/^\/jobs\/[^/]+$/, "jobDetails"],
  [/^\/jobs$/, "jobFeed"],
  [/^\/profile\/edit$/, "profileSetup"],
  [/^\/profile$/, "profile"],
  [/^\/dashboard$/, "businessHome"],
  [/^\/branches$/, "branches"],
  [/^\/baristas\/[^/]+\/offer$/, "offerJob"],
  [/^\/baristas\/[^/]+$/, "baristaProfile"],
  [/^\/baristas$/, "baristaFeed"],
  [/^\/applications(\/|$)/, "applications"],
  [/^\/chats(\/|$)/, "chats"],
  [/^\/notifications$/, "notifications"],
  [/^\/settings(\/|$)/, "settings"],
];

export const pathnameToRoute = (pathname: string): TutorialRouteKey => {
  const match = ROUTE_PATTERNS.find(([pattern]) => pattern.test(pathname));
  return match ? match[1] : "other";
};

const HREF_BY_ROUTE: Readonly<Record<TutorialRouteKey, string | null>> = {
  profile: "/profile",
  profileSetup: "/profile/edit",
  branches: "/branches?new=1",
  jobFeed: "/jobs",
  jobDetails: "/jobs",
  apply: "/jobs",
  applications: "/applications",
  chats: "/chats",
  notifications: "/notifications",
  settings: "/settings",
  businessHome: "/dashboard",
  applicants: "/dashboard",
  createJob: "/jobs/new",
  baristaFeed: "/baristas",
  baristaProfile: "/baristas",
  offerJob: "/baristas",
  other: null,
};

export const routeToHref = (route: TutorialRouteKey): string | null =>
  HREF_BY_ROUTE[route];
