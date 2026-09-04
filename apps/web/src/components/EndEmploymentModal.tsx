"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  EmploymentEndReason,
  EmploymentSide,
} from "@bystrobarista/core/types/employment";
import {
  endReasonLabelKey,
  endReasonsForSide,
} from "@bystrobarista/core/utils/employment";

const MAX_COMMENT_LENGTH = 500;

type Props = {
  open: boolean;
  side: EmploymentSide;
  initialReason?: EmploymentEndReason;
  onSubmit: (reason: EmploymentEndReason, comment?: string) => Promise<void>;
  onClose: () => void;
};

// Reason picker for ending a permanent hire (either side). Stays open when
// onSubmit rejects so the user can retry; the caller reports the failure.
export function EndEmploymentModal({
  open,
  side,
  initialReason,
  onSubmit,
  onClose,
}: Props): React.JSX.Element | null {
  const { t } = useTranslation();
  const [reason, setReason] = useState<EmploymentEndReason | null>(
    initialReason ?? null,
  );
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (): Promise<void> => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(reason, comment.trim() || undefined);
      setReason(null);
      setComment("");
    } catch {
      // Failure already surfaced by the caller; keep the form for a retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-card bg-white p-6">
        <h2 className="text-lg font-semibold">{t("employment.end.title")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          {t(
            side === "business"
              ? "employment.end.bodyBusiness"
              : "employment.end.bodyBarista",
          )}
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">
            {t("employment.end.reasonLabel")}
          </legend>
          {endReasonsForSide(side).map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 py-1.5 text-sm"
            >
              <input
                type="radio"
                name="employment-end-reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="h-4 w-4 accent-primary"
              />
              {t(endReasonLabelKey(value))}
            </label>
          ))}
        </fieldset>

        <textarea
          rows={3}
          value={comment}
          onChange={(e) =>
            setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))
          }
          maxLength={MAX_COMMENT_LENGTH}
          placeholder={t("employment.end.commentPlaceholder")}
          className="mt-3 w-full rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!reason || submitting}
            className="rounded-card bg-error px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("employment.end.confirm")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-card px-4 py-2.5 text-sm font-medium text-ink-secondary disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
