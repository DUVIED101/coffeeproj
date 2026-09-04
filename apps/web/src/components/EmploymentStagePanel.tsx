"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import type {
  Employment,
  EmploymentEndReason,
  EmploymentSide,
} from "@bystrobarista/core/types/employment";
import {
  canCancelEmploymentEndRequest,
  canConfirmEmploymentEnd,
  canConfirmEmploymentStart,
  canRequestEmploymentEnd,
} from "@bystrobarista/core/utils/employment";
import { formatDateOnly } from "@/lib/dates";
import {
  employmentEndedByLine,
  employmentReasonLine,
  employmentStageLine,
} from "@/lib/employmentUi";

type Props = {
  employment: Employment;
  side: EmploymentSide;
  busy: boolean;
  onConfirmStart: () => void;
  onRequestEnd: (initialReason?: EmploymentEndReason) => void;
  onConfirmEnd: () => void;
  onCancelEndRequest: () => void;
};

const primaryButton =
  "flex-1 rounded-card bg-success px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const dangerButton =
  "flex-1 rounded-card border border-error px-4 py-2.5 text-sm font-semibold text-error disabled:opacity-50";
const neutralButton =
  "flex-1 rounded-card border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-50";

// Stage line plus the actions the viewer's side can take right now. Shared by
// the applicants page, the staff tab and the barista's application page.
export function EmploymentStagePanel({
  employment,
  side,
  busy,
  onConfirmStart,
  onRequestEnd,
  onConfirmEnd,
  onCancelEndRequest,
}: Props): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const isBusiness = side === "business";

  const showStart = canConfirmEmploymentStart(employment);
  const showNoShow = showStart && isBusiness;
  const showRequestEnd = canRequestEmploymentEnd(employment) && !showNoShow;
  const showConfirmEnd = canConfirmEmploymentEnd(employment, side);
  const showCancelEnd = canCancelEmploymentEndRequest(employment, side);
  const hasActions =
    showStart || showRequestEnd || showConfirmEnd || showCancelEnd;
  const reasonLine = employmentReasonLine(employment, t);

  return (
    <div className="mt-3 rounded-input bg-bg-secondary p-3">
      <p className="text-sm font-semibold">
        {employmentStageLine(employment, t, locale)}
      </p>
      {showConfirmEnd && (
        <p className="mt-1 text-sm">
          {t(
            isBusiness
              ? "employment.end.pendingByBarista"
              : "employment.end.pendingByBusiness",
          )}
        </p>
      )}
      {showCancelEnd && (
        <p className="mt-1 text-sm">{t("employment.end.pendingOwn")}</p>
      )}
      {reasonLine && (
        <p className="mt-1 text-sm text-ink-secondary">{reasonLine}</p>
      )}
      {employment.endComment && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-secondary">
          {employment.endComment}
        </p>
      )}
      {employment.status === "ending" && employment.endAutoConfirmAt && (
        <p className="mt-1 text-xs text-ink-secondary">
          {t("employment.end.autoHint", {
            date: formatDateOnly(employment.endAutoConfirmAt, locale),
          })}
        </p>
      )}
      {employment.status === "ended" && (
        <p className="mt-1 text-sm text-ink-secondary">
          {employmentEndedByLine(employment, t)}
        </p>
      )}

      {hasActions && (
        <div className="mt-3 flex flex-wrap gap-2">
          {showStart && (
            <button
              type="button"
              disabled={busy}
              onClick={onConfirmStart}
              className={primaryButton}
            >
              {t(
                isBusiness
                  ? "employment.start.action"
                  : "employment.start.actionBarista",
              )}
            </button>
          )}
          {showNoShow && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRequestEnd("no_show")}
              className={dangerButton}
            >
              {t("employment.start.noShow")}
            </button>
          )}
          {showRequestEnd && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRequestEnd()}
              className={dangerButton}
            >
              {t(
                isBusiness
                  ? "employment.end.actionBusiness"
                  : "employment.end.actionBarista",
              )}
            </button>
          )}
          {showConfirmEnd && (
            <button
              type="button"
              disabled={busy}
              onClick={onConfirmEnd}
              className={primaryButton}
            >
              {t("employment.end.confirmAction")}
            </button>
          )}
          {showCancelEnd && (
            <button
              type="button"
              disabled={busy}
              onClick={onCancelEndRequest}
              className={neutralButton}
            >
              {t("employment.end.cancelRequest")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
