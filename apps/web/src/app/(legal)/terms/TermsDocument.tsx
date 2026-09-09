"use client";

import React from "react";
import { TERMS_BODY } from "@bystrobarista/core/legal/terms";
import { LegalDocument } from "@/components/LegalDocument";

export function TermsDocument(): React.JSX.Element {
  return (
    <LegalDocument titleKey="settings.legal.termsTitle" body={TERMS_BODY} />
  );
}
