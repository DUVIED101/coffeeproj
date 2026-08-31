"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import type { ApplicationId, UserId } from "@bystrobarista/core/types/ids";
import type {
  ApplicationReview,
  RaterRole,
  StarRating,
} from "@bystrobarista/core/types/review";

const MAX_COMMENT_LENGTH = 500;

type Props = {
  open: boolean;
  applicationId: ApplicationId;
  raterRole: RaterRole;
  rateeId: UserId;
  onSubmitted: (review: ApplicationReview) => void;
  onSkip: () => void;
};

// Web port of mobile's ReviewModal: 5 tappable stars + optional comment.
export function ReviewModal({
  open,
  applicationId,
  raterRole,
  rateeId,
  onSubmitted,
  onSkip,
}: Props): React.JSX.Element | null {
  const { t } = useTranslation();
  const [rating, setRating] = useState<StarRating | 0>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (): Promise<void> => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const review = await ReviewService.createReview({
        applicationId,
        raterRole,
        rateeId,
        rating,
        comment: comment.trim() || undefined,
      });
      setRating(0);
      setComment("");
      onSubmitted(review);
    } catch {
      setError(t("reviews.errors.submitFailed"));
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
        <h2 className="text-lg font-semibold">{t("reviews.modal.title")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("reviews.modal.subtitle")}
        </p>

        <div className="mt-4 flex justify-center gap-2">
          {([1, 2, 3, 4, 5] as StarRating[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={t("reviews.modal.starLabel", { n })}
              className={`text-3xl ${n <= rating ? "text-warning" : "text-line"}`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={comment}
          onChange={(e) =>
            setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))
          }
          placeholder={t("reviews.modal.commentPlaceholder")}
          className="mt-4 w-full rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p className="mt-1 text-right text-xs text-ink-secondary">
          {t("reviews.modal.charCounter", { count: comment.length })}
        </p>

        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("reviews.modal.submit")}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-card px-4 py-2.5 text-sm font-medium text-ink-secondary"
          >
            {t("reviews.modal.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
