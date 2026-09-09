"use client";

import React from "react";
import { DATA_CONSENT_BODY } from "@bystrobarista/core/legal/dataConsent";
import { LegalDocument } from "@/components/LegalDocument";

export function DataConsentDocument(): React.JSX.Element {
  return (
    <LegalDocument
      titleKey="settings.legal.dataConsentTitle"
      body={DATA_CONSENT_BODY}
    />
  );
}
