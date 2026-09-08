// Where the web shell's back arrow lands when there is no in-app history
// (deep link, notification tap, fresh tab). Tab roots get no arrow at all.
const TAB_ROOTS = new Set([
  "/",
  "/jobs",
  "/applications",
  "/chats",
  "/profile",
  "/dashboard",
  "/baristas",
]);

// First segments whose bare path is not a page, so "up one level" must skip it.
const NO_INDEX_PAGE = new Set(["businesses", "reviews", "offers"]);

// Sections opened from a tab or the header, keyed by their first segment.
const SECTION_HOME: Record<string, string> = {
  businesses: "/jobs",
  reviews: "/profile",
  offers: "/applications",
  settings: "/profile",
  notifications: "/",
  push: "/notifications",
  disputes: "/profile",
  shifts: "/profile",
  branches: "/profile",
  "shift-alerts": "/shifts",
};

export const backTarget = (pathname: string): string | null => {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  if (TAB_ROOTS.has(path)) return null;
  const segments = path.split("/").filter(Boolean);
  if (
    segments.length >= 2 &&
    !(segments.length === 2 && NO_INDEX_PAGE.has(segments[0]))
  ) {
    return `/${segments.slice(0, -1).join("/")}`;
  }
  return SECTION_HOME[segments[0]] ?? "/";
};
