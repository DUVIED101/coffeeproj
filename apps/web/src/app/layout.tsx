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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
