import type { Metadata } from "next";
import React from "react";
import { OG_IMAGE } from "@/lib/site";
import { PrivacyDocument } from "./PrivacyDocument";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy", images: [OG_IMAGE] },
};

export default function Page(): React.JSX.Element {
  return <PrivacyDocument />;
}
