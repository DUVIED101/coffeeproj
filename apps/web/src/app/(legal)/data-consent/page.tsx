"use client";

import React from "react";
import { DATA_CONSENT_BODY } from "@bystrobarista/core/legal/dataConsent";
import { LegalDocument } from "@/components/LegalDocument";

export default function PublicDataConsentPage(): React.JSX.Element {
  return (
    <LegalDocument
      titleKey="settings.legal.dataConsentTitle"
      body={DATA_CONSENT_BODY}
    />
  );
}
