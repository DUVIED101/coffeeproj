import type { Metadata, Viewport } from "next";
import React from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "БыстроБариста",
    template: "%s — БыстроБариста",
  },
  description:
    "Биржа смен для бариста и кофеен: находите смены рядом, публикуйте вакансии, договаривайтесь в чате.",
  metadataBase: new URL("https://app.bystrobarista.com"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
