"use client";

import { useParams } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import type { UserId } from "@bystrobarista/core/types/ids";
import { StarRow } from "@/components/StarRow";

// Port of UserReviewsScreen: rating aggregate header + anonymous review list.
export default function UserReviewsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const params = useParams<{ userId: string }>();
  const userId = params.userId as UserId;

  const aggregateQuery = useQuery({
    queryKey: ["reviews", "aggregate", userId],
    queryFn: () => ReviewService.getAggregateForUser(userId),
  });

  const reviewsQuery = useQuery({
    queryKey: ["reviews", "forUser", userId],
    queryFn: () => ReviewService.getReviewsForUser(userId),
  });

  const aggregate = aggregateQuery.data;
  const reviews = reviewsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t("reviews.title")}</h1>

      <div className="mb-4 rounded-card border border-line bg-white p-4 text-center">
        {aggregate && aggregate.reviewCount > 0 ? (
          <StarRow
            rating={aggregate.averageRating}
            count={aggregate.reviewCount}
            showValue
          />
        ) : (
          <p className="text-sm text-ink-secondary">
            {t("reviews.noRatingsShort")}
          </p>
        )}
      </div>

      {reviewsQuery.isPending ? (
        <div className="h-40 animate-pulse rounded-card bg-bg-secondary" />
      ) : reviews.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-secondary">
          {t("reviews.empty")}
        </p>
      ) : (
        reviews.map((review) => (
          <div
            key={review.id}
            className="mb-3 rounded-card border border-line bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <StarRow rating={review.rating} showValue />
              <span className="text-xs text-ink-secondary">
                {new Date(review.createdAt).toLocaleDateString(locale)}
              </span>
            </div>
            {review.comment && <p className="mt-2 text-sm">{review.comment}</p>}
            <p className="mt-1 text-xs text-ink-secondary">
              {t("reviews.anonymous")}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
