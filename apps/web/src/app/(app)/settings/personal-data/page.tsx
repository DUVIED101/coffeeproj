"use client";

import React from "react";
import { PERSONAL_DATA_POLICY_BODY } from "@bystrobarista/core/legal/personalDataPolicy";
import { LegalDocument } from "@/components/LegalDocument";

export default function PersonalDataPolicyPage(): React.JSX.Element {
  return (
    <LegalDocument
      titleKey="settings.legal.personalDataPolicyTitle"
      body={PERSONAL_DATA_POLICY_BODY}
    />
  );
}
