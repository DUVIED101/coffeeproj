"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { getPlatform } from "@bystrobarista/core/platform";
import { ReportService } from "@bystrobarista/core/services/ReportService";
import type {
  ReportReasonCode,
  ReportTargetType,
} from "@bystrobarista/core/types/userReport";

export type ReportTarget = { type: ReportTargetType; id: string };

// Same reason sets per target as mobile's useReportSheet.
const REASONS_BY_TARGET: Record<ReportTargetType, ReportReasonCode[]> = {
  user: ["spam", "fraud", "harassment", "noshow", "offensive_photo", "other"],
  business: ["fraud", "harassment", "offensive_photo", "other"],
  branch: ["fraud", "harassment", "offensive_photo", "other"],
  job: ["spam", "fraud", "offensive_photo", "other"],
  message: ["spam", "harassment", "offensive_photo", "other"],
  review: ["spam", "harassment", "fraud", "other"],
};

const DETAILS_MAX_LENGTH = 500;

// Web port of mobile's report bottom sheet: pick a reason, optional details,
// submit through ReportService (RLS pins reporter_id to the caller).
export function ReportDialog({
  target,
  onClose,
}: {
  target: ReportTarget;
  onClose: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReasonCode | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await ReportService.submitReport({
        targetType: target.type,
        targetId: target.id,
        reasonCode: reason,
        details: details || undefined,
      });
      getPlatform().alert.show(t("report.success"), "");
      onClose();
    } catch {
      getPlatform().alert.show(t("report.error"), "");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
    >
      <div className="w-full max-w-md rounded-card bg-white p-5">
        <h2 id="report-dialog-title" className="mb-1 text-lg font-bold">
          {t("report.title")}
        </h2>
        <p className="mb-3 text-sm text-ink-secondary">
          {t("report.subtitle")}
        </p>
        <p className="mb-2 text-xs font-medium text-ink-secondary">
          {t("report.chooseReason")}
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {REASONS_BY_TARGET[target.type].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setReason(code)}
              aria-pressed={reason === code}
              className={`rounded-chip border px-3 py-1.5 text-sm ${
                reason === code
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-white text-ink"
              }`}
            >
              {t(`report.reason.${code}`)}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t("report.detailsPlaceholder")}
          rows={3}
          maxLength={DETAILS_MAX_LENGTH}
          className="mb-4 w-full rounded-input border border-line p-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-line px-4 py-2 text-sm font-medium"
          >
            {t("report.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!reason || submitting}
            className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("report.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
