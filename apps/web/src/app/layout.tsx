import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import React from "react";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { CookieNotice } from "@/components/CookieNotice";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: SITE_NAME,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.webmanifest",
  // Favicon and Apple touch icon come from app/icon.png and app/apple-icon.png
  // (Next file conventions); the PWA icons live in the manifest.
  // iOS Safari only offers Web Push to Home Screen installs (16.4+).
  appleWebApp: {
    capable: true,
    title: "БыстроБариста",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8B4513",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="ru">
      <body>
        <Providers>
          {children}
          <CookieNotice />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
