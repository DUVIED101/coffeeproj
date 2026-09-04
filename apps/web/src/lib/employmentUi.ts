import type { TFunction } from "i18next";
import type {
  Employment,
  EmploymentStatus,
} from "@bystrobarista/core/types/employment";
import { endReasonLabelKey } from "@bystrobarista/core/utils/employment";
import { formatDateOnly } from "@/lib/dates";

export const EMPLOYMENT_BADGE: Record<EmploymentStatus, string> = {
  pending_start: "bg-[#F59E0B]",
  active: "bg-[#10B981]",
  ending: "bg-[#F59E0B]",
  ended: "bg-[#6B7280]",
};

const stageDate = (employment: Employment): string | undefined => {
  switch (employment.status) {
    case "pending_start":
      return employment.startDate;
    case "active":
      return employment.startedAt ?? employment.startDate;
    case "ending":
      return undefined;
    case "ended":
      return employment.endedAt;
  }
};

export const employmentStageLine = (
  employment: Employment,
  t: TFunction,
  locale: string,
): string => {
  const date = stageDate(employment);
  return t(`employment.stage.${employment.status}`, {
    date: date ? formatDateOnly(date, locale) : "",
  });
};

export const employmentReasonLine = (
  employment: Pick<Employment, "endReason">,
  t: TFunction,
): string | null =>
  employment.endReason
    ? t("employment.end.reasonLine", {
        reason: t(endReasonLabelKey(employment.endReason)),
      })
    : null;

export const employmentEndedByLine = (
  employment: Pick<Employment, "endRequestedBy" | "endConfirmedBy">,
  t: TFunction,
): string => {
  const initiator = t(
    employment.endRequestedBy === "barista"
      ? "employment.end.endedByBarista"
      : "employment.end.endedByBusiness",
  );
  return employment.endConfirmedBy === "auto"
    ? `${initiator} · ${t("employment.end.endedAuto")}`
    : initiator;
};
