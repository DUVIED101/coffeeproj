import type { Metadata } from "next";
import React from "react";
import { OG_IMAGE } from "@/lib/site";
import { TermsDocument } from "./TermsDocument";

export const metadata: Metadata = {
  title: "Условия использования",
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms", images: [OG_IMAGE] },
};

export default function Page(): React.JSX.Element {
  return <TermsDocument />;
}
