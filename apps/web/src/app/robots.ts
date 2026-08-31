import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/auth/",
        "/api/",
        "/jobs",
        "/dashboard",
        "/chats",
        "/settings",
        "/notifications",
        "/disputes",
      ],
    },
    sitemap: "https://app.bystrobarista.com/sitemap.xml",
  };
}
