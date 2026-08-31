"use client";

import React from "react";
import { PRIVACY_POLICY_BODY } from "@bystrobarista/core/legal/privacyPolicy";
import { LegalDocument } from "@/components/LegalDocument";

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <LegalDocument
      titleKey="settings.legal.privacyTitle"
      body={PRIVACY_POLICY_BODY}
    />
  );
}
