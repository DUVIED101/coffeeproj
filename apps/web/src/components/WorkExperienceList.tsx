"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import type { WorkExperience } from "@bystrobarista/core/types/workExperience";
import {
  computeDuration,
  computeTotalDuration,
} from "@bystrobarista/core/types/workExperience";

type Props = {
  experiences: WorkExperience[];
  locale: string;
};

// Read-only work history: total span in the header, one row per employer.
// Shared by the public barista page and the barista's own profile.
export function WorkExperienceList({
  experiences,
  locale,
}: Props): React.JSX.Element {
  const { t } = useTranslation();

  const formatMonthYear = (year: number, month: number): string =>
    new Date(year, month - 1, 1).toLocaleDateString(locale, {
      month: "short",
      year: "numeric",
    });

  const totalDuration = computeTotalDuration(
    experiences.map((e) => ({
      startYear: e.startYear,
      startMonth: e.startMonth,
      endYear: e.endYear,
      endMonth: e.endMonth,
      isCurrent: e.isCurrent,
    })),
  );

  return (
    <>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">
          {t("barista.workExperience.title")}
        </h2>
        {experiences.length > 0 && (
          <span className="text-xs text-ink-secondary">
            {t("barista.workExperience.totalShort", {
              years: totalDuration.years,
              months: totalDuration.months,
            })}
          </span>
        )}
      </div>
      {experiences.length === 0 && (
        <p className="text-sm text-ink-secondary">{t("common.notSpecified")}</p>
      )}
      {experiences.map((experience) => {
        const duration = computeDuration({
          startYear: experience.startYear,
          startMonth: experience.startMonth,
          endYear: experience.endYear,
          endMonth: experience.endMonth,
          isCurrent: experience.isCurrent,
        });
        const start = formatMonthYear(
          experience.startYear,
          experience.startMonth,
        );
        const range =
          experience.isCurrent ||
          experience.endYear == null ||
          experience.endMonth == null
            ? t("barista.workExperience.currentRange", { start })
            : t("barista.workExperience.rangeWithEnd", {
                start,
                end: formatMonthYear(experience.endYear, experience.endMonth),
              });
        return (
          <div
            key={experience.id}
            className="border-t border-line py-2.5 first:border-t-0"
          >
            <p className="text-sm font-medium">
              {experience.position} · {experience.employer}
            </p>
            <p className="text-xs text-ink-secondary">
              {range} ·{" "}
              {t("barista.workExperience.duration", {
                years: duration.years,
                months: duration.months,
              })}
            </p>
            {experience.description && (
              <p className="mt-1 text-sm">{experience.description}</p>
            )}
          </div>
        );
      })}
    </>
  );
}
