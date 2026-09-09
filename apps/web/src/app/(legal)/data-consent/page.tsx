import type { Metadata } from "next";
import React from "react";
import { OG_IMAGE } from "@/lib/site";
import { DataConsentDocument } from "./DataConsentDocument";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных",
  alternates: { canonical: "/data-consent" },
  openGraph: { url: "/data-consent", images: [OG_IMAGE] },
};

export default function Page(): React.JSX.Element {
  return <DataConsentDocument />;
}
