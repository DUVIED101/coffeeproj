import type { Metadata } from "next";
import React from "react";
import { OG_IMAGE } from "@/lib/site";
import { PersonalDataDocument } from "./PersonalDataDocument";

export const metadata: Metadata = {
  title: "Политика обработки персональных данных",
  alternates: { canonical: "/personal-data" },
  openGraph: { url: "/personal-data", images: [OG_IMAGE] },
};

export default function Page(): React.JSX.Element {
  return <PersonalDataDocument />;
}
