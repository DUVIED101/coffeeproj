"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import {
  MAX_WORK_EXPERIENCES,
  computeDuration,
  makeEmptyDraft,
  type WorkExperienceDraft,
  type WorkExperienceFieldError,
} from "@bystrobarista/core/types/workExperience";
import {
  SHORT_TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "@bystrobarista/core/utils/validation";

const MIN_YEAR = 1960;
const DESCRIPTION_MAX = 500;

type Props = {
  drafts: WorkExperienceDraft[];
  errors: ReadonlyArray<ReadonlyArray<WorkExperienceFieldError>>;
  onChange: (drafts: WorkExperienceDraft[]) => void;
};

type MonthYearProps = {
  label: string;
  month: number | null;
  year: number | null;
  minYear?: number;
  invalid: boolean;
  onChange: (month: number | null, year: number | null) => void;
};

function MonthYearSelect({
  label,
  month,
  year,
  minYear = MIN_YEAR,
  invalid,
  onChange,
}: MonthYearProps): React.JSX.Element {
  const { i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= minYear; y--) years.push(y);

  const monthName = (m: number): string =>
    new Date(2000, m - 1, 1).toLocaleDateString(locale, { month: "long" });

  const border = invalid ? "border-error" : "border-line";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-secondary">{label}</span>
      <div className="flex gap-2">
        <select
          value={month ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null, year)
          }
          className={`flex-1 rounded-input border ${border} bg-white px-2 py-2 text-sm outline-none focus:border-primary`}
        >
          <option value="" />
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </select>
        <select
          value={year ?? ""}
          onChange={(e) =>
            onChange(month, e.target.value ? Number(e.target.value) : null)
          }
          className={`w-24 rounded-input border ${border} bg-white px-2 py-2 text-sm outline-none focus:border-primary`}
        >
          <option value="" />
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Web port of mobile's WorkExperienceEditor: one card per entry with
// employer/position, month-year start/end pickers, an "I work here now"
// toggle and an optional description. Validation state comes from the parent
// (findDraftErrors on submit) so cards highlight the exact failing fields.
export function WorkExperienceEditor({
  drafts,
  errors,
  onChange,
}: Props): React.JSX.Element {
  const { t } = useTranslation();

  const patch = (
    index: number,
    changes: Partial<WorkExperienceDraft>,
  ): void => {
    onChange(drafts.map((d, i) => (i === index ? { ...d, ...changes } : d)));
  };

  const remove = (index: number): void => {
    if (!window.confirm(t("barista.workExperience.removeConfirm"))) return;
    onChange(drafts.filter((_, i) => i !== index));
  };

  const inputClass = (invalid: boolean): string =>
    `rounded-input border ${invalid ? "border-error" : "border-line"} px-3 py-2 text-sm outline-none focus:border-primary`;

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft, index) => {
        const entryErrors = errors[index] ?? [];
        const duration =
          draft.startYear !== null && draft.startMonth !== null
            ? computeDuration({
                startYear: draft.startYear,
                startMonth: draft.startMonth,
                endYear: draft.endYear,
                endMonth: draft.endMonth,
                isCurrent: draft.isCurrent,
              })
            : null;
        return (
          <div
            key={draft.id ?? `draft-${index}`}
            className={`rounded-card border ${
              entryErrors.length > 0 ? "border-error" : "border-line"
            } bg-white p-4`}
          >
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-secondary">
                  {t("barista.workExperience.employer")}
                </span>
                <input
                  type="text"
                  value={draft.employer}
                  onChange={(e) =>
                    patch(index, {
                      employer: e.target.value.slice(0, SHORT_TEXT_MAX_LENGTH),
                    })
                  }
                  placeholder={t("workExperienceEditor.employerPlaceholder")}
                  className={inputClass(entryErrors.includes("employer"))}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-secondary">
                  {t("barista.workExperience.position")}
                </span>
                <input
                  type="text"
                  value={draft.position}
                  onChange={(e) =>
                    patch(index, {
                      position: e.target.value.slice(0, TITLE_MAX_LENGTH),
                    })
                  }
                  placeholder={t("workExperienceEditor.positionPlaceholder")}
                  className={inputClass(entryErrors.includes("position"))}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <MonthYearSelect
                  label={t("barista.workExperience.startDate")}
                  month={draft.startMonth}
                  year={draft.startYear}
                  invalid={entryErrors.includes("startDate")}
                  onChange={(m, y) =>
                    patch(index, { startMonth: m, startYear: y })
                  }
                />
                {!draft.isCurrent && (
                  <MonthYearSelect
                    label={t("barista.workExperience.endDate")}
                    month={draft.endMonth}
                    year={draft.endYear}
                    minYear={draft.startYear ?? MIN_YEAR}
                    invalid={entryErrors.includes("endDate")}
                    onChange={(m, y) =>
                      patch(index, { endMonth: m, endYear: y })
                    }
                  />
                )}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isCurrent}
                  onChange={(e) =>
                    patch(index, {
                      isCurrent: e.target.checked,
                      ...(e.target.checked
                        ? { endYear: null, endMonth: null }
                        : {}),
                    })
                  }
                  className="h-4 w-4 accent-primary"
                />
                {t("barista.workExperience.currentlyWorking")}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-secondary">
                  {t("barista.workExperience.description")}
                </span>
                <textarea
                  rows={2}
                  value={draft.description ?? ""}
                  onChange={(e) =>
                    patch(index, {
                      description:
                        e.target.value.slice(0, DESCRIPTION_MAX) || null,
                    })
                  }
                  className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="flex items-center justify-between">
                {duration ? (
                  <span className="text-xs text-ink-secondary">
                    {t("barista.workExperience.duration", {
                      years: duration.years,
                      months: duration.months,
                    })}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-sm font-medium text-error"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {drafts.length < MAX_WORK_EXPERIENCES ? (
        <button
          type="button"
          onClick={() => onChange([...drafts, makeEmptyDraft()])}
          className="rounded-card border border-dashed border-primary px-4 py-3 text-sm font-medium text-primary"
        >
          {t("barista.workExperience.addButton")}
        </button>
      ) : (
        <p className="text-center text-xs text-ink-secondary">
          {t("barista.workExperience.limitReached", {
            max: MAX_WORK_EXPERIENCES,
          })}
        </p>
      )}
    </div>
  );
}
