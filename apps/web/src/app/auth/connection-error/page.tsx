"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function ConnectionErrorPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="flex flex-col gap-4 text-center">
      <h1 className="text-xl font-bold">{t("connectionError.title")}</h1>
      <p className="text-sm text-ink-secondary">{t("connectionError.body")}</p>
      <SubmitButton
        type="button"
        label={t("connectionError.retry")}
        loading={retrying}
        onClick={() => {
          setRetrying(true);
          window.location.assign("/");
        }}
      />
    </div>
  );
}
