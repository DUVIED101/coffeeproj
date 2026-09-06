import type { MetadataRoute } from "next";

const SITE = "https://app.bystrobarista.com";

// Only publicly reachable pages belong here. Everything behind auth is
// disallowed in robots.ts and must never be listed.
const PUBLIC_PATHS = [
  "/",
  "/terms",
  "/privacy",
  "/personal-data",
  "/data-consent",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.3,
  }));
}
