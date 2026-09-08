"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { backTarget } from "@bystrobarista/core/utils/backTarget";
import { BackLink } from "@/components/BackLink";

// One back arrow for every drill-in page (cards, sub-pages, settings); tab
// roots render nothing. Lives in the sticky header, level with the brand,
// so it never pushes page content down.
export function BackBar(): React.JSX.Element | null {
  const { t } = useTranslation();
  const target = backTarget(usePathname());
  if (!target) return null;
  return <BackLink fallbackHref={target} label={t("common.back")} />;
}
