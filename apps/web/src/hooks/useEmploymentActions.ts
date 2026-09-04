"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { getPlatform } from "@bystrobarista/core/platform";
import { EmploymentService } from "@bystrobarista/core/services/EmploymentService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import type { RequestEmploymentEndData } from "@bystrobarista/core/types/employment";
import type { ApplicationId } from "@bystrobarista/core/types/ids";
import type { RaterRole } from "@bystrobarista/core/types/review";

// Every query that embeds an employment or derives from application status.
const AFFECTED_QUERY_KEYS = [["applications"], ["employments"], ["shifts"]];

export type EmploymentActions = {
  confirmStart: (applicationId: ApplicationId) => Promise<boolean>;
  requestEnd: (data: RequestEmploymentEndData) => Promise<void>;
  confirmEnd: (applicationId: ApplicationId) => Promise<boolean>;
  cancelEndRequest: (applicationId: ApplicationId) => Promise<boolean>;
  isAlreadyReviewed: (
    applicationId: ApplicationId,
    raterRole: RaterRole,
  ) => Promise<boolean>;
  isBusy: (applicationId: string) => boolean;
};

// Shared by the applicants page, the application page and the staff tab: the
// confirm prompts, the success/failure alerts and the query invalidation for
// every employment lifecycle step live here.
export function useEmploymentActions(): EmploymentActions {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const confirmDialog = (titleKey: string, bodyKey: string): boolean =>
    window.confirm(`${t(titleKey)}\n\n${t(bodyKey)}`);

  const notify = (title: string, message: string): void =>
    getPlatform().alert.show(title, message, [{ text: t("common.ok") }]);

  const run = async (
    applicationId: ApplicationId,
    action: () => Promise<unknown>,
    successKey: string,
    failureKey: string,
  ): Promise<boolean> => {
    setBusyIds((prev) => new Set(prev).add(applicationId));
    try {
      await action();
      await Promise.all(
        AFFECTED_QUERY_KEYS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      notify(t("common.success"), t(successKey));
      return true;
    } catch {
      notify(t("common.error"), t(failureKey));
      return false;
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  };

  return {
    confirmStart: async (applicationId) => {
      if (
        !confirmDialog(
          "employment.start.confirmTitle",
          "employment.start.confirmBody",
        )
      ) {
        return false;
      }
      return run(
        applicationId,
        () => EmploymentService.confirmStart(applicationId),
        "employment.start.success",
        "employment.start.failure",
      );
    },
    requestEnd: async (data) => {
      const sent = await run(
        data.applicationId,
        () => EmploymentService.requestEnd(data),
        "employment.end.requestSuccess",
        "employment.end.failure",
      );
      if (!sent) throw new Error("EMPLOYMENT_END_REQUEST_FAILED");
    },
    confirmEnd: async (applicationId) => {
      if (
        !confirmDialog(
          "employment.end.confirmTitle",
          "employment.end.confirmBody",
        )
      ) {
        return false;
      }
      return run(
        applicationId,
        () => EmploymentService.confirmEnd(applicationId),
        "employment.end.confirmSuccess",
        "employment.end.failure",
      );
    },
    cancelEndRequest: (applicationId) =>
      run(
        applicationId,
        () => EmploymentService.cancelEndRequest(applicationId),
        "employment.end.cancelSuccess",
        "employment.end.failure",
      ),
    isAlreadyReviewed: async (applicationId, raterRole) =>
      Boolean(
        await ReviewService.getReviewByApplication(
          applicationId,
          raterRole,
        ).catch(() => null),
      ),
    isBusy: (applicationId) => busyIds.has(applicationId),
  };
}
