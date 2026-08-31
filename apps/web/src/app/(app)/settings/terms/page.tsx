"use client";

import React from "react";
import { TERMS_BODY } from "@bystrobarista/core/legal/terms";
import { LegalDocument } from "@/components/LegalDocument";

export default function TermsPage(): React.JSX.Element {
  return (
    <LegalDocument titleKey="settings.legal.termsTitle" body={TERMS_BODY} />
  );
}
