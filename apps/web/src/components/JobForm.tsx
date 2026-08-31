"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatform } from "@bystrobarista/core/platform";
import { BusinessService } from "@bystrobarista/core/services/BusinessService";
import { JobService } from "@bystrobarista/core/services/JobService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import {
  EQUIPMENT_TYPES,
  SHOW_PLATFORM_FEE,
  PLATFORM_FEE_RATE,
} from "@bystrobarista/core/config/constants";
import type {
  CompensationType,
  CreateJobData,
  Job,
  JobType,
  ShiftDetails,
  WeekdayKey,
} from "@bystrobarista/core/types/job";
import type { Equipment } from "@bystrobarista/core/types/business";
import { computeShiftHours } from "@bystrobarista/core/utils/shiftHours";
import { jobMaxDate, jobMinDate } from "@bystrobarista/core/utils/dateRanges";
import {
  COMPENSATION_MAX_DIGITS,
  DESCRIPTION_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  sanitizeDigitsInput,
} from "@bystrobarista/core/utils/validation";
import { clampToEffectiveLength } from "@bystrobarista/core/utils/textLength";

const DAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const WEEKDAY_KEYS: readonly WeekdayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

const TAG_OPTIONS = ["urgent", "flexible", "training-provided"];

const HOURS_PER_WEEK_MIN = 1;
const HOURS_PER_WEEK_MAX = 80;

// Same screen-local helpers as mobile's CreateJobScreen (see that file for
// rationale) — patterns stay stored as plain "5/2" strings.
const parseSchedulePattern = (raw: string): { on: string; off: string } => {
  const [rawOn = "", rawOff = ""] = raw.split("/");
  return {
    on: rawOn.replace(/\D/g, "").slice(0, 1),
    off: rawOff.replace(/\D/g, "").slice(0, 1),
  };
};

const sanitizeHoursPerWeekInput = (input: string): string => {
  const cleaned = input.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned.slice(0, 2);
  const intPart = cleaned.slice(0, firstDot).slice(0, 2);
  const fracPart = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, "")
    .slice(0, 1);
  return `${intPart}.${fracPart}`;
};

const sanitizePercentInput = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 3);
  if (digits === "") return "";
  const n = Number(digits);
  if (n > 100) return "100";
  return String(n);
};

const toIsoDay = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const nowTime = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const chip = (active: boolean): string =>
  `rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
    active
      ? "border-primary bg-primary text-white"
      : "border-line bg-white text-ink"
  }`;

const fieldLabel = "text-sm font-medium text-ink";
const inputClass = (invalid?: boolean): string =>
  `rounded-input border ${invalid ? "border-error" : "border-line"} px-3 py-2 text-sm outline-none focus:border-primary`;

type Errors = Partial<Record<string, string>>;

// Web port of mobile's CreateJobScreen — serves both create (/jobs/new) and
// edit (/jobs/[jobId]/edit). Same field set, sanitizers, validation rules and
// JobService payloads; only the pickers are native web inputs.
export function JobForm({
  editJobId,
}: {
  editJobId?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isEditMode = Boolean(editJobId);

  const [jobType, setJobType] = useState<JobType>("temporary");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<string[]>([""]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);
  const [startDate, setStartDate] = useState(toIsoDay(new Date()));
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState(nowTime());
  const [endTime, setEndTime] = useState(nowTime());
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [preferredDayIdxs, setPreferredDayIdxs] = useState<number[]>([]);
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [customSchedulePatterns, setCustomSchedulePatterns] = useState<
    string[]
  >([]);
  const [compensationType, setCompensationType] =
    useState<CompensationType>("hourly");
  const [compensationAmount, setCompensationAmount] = useState("");
  const [salesBonusPercent, setSalesBonusPercent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const businessQuery = useQuery({
    queryKey: ["business", "byOwner", user?.id],
    queryFn: () => BusinessService.getBusinessByOwnerId(user?.id as string),
    enabled: Boolean(user?.id),
  });
  const business = businessQuery.data;

  const branchesQuery = useQuery({
    queryKey: ["branches", business?.id],
    queryFn: () => BusinessService.getBranches(business?.id as string),
    enabled: Boolean(business?.id),
  });
  const branches = useMemo(
    () => branchesQuery.data ?? [],
    [branchesQuery.data],
  );

  const editJobQuery = useQuery({
    queryKey: ["jobs", "byId", editJobId],
    queryFn: () => JobService.getJobById(editJobId as string),
    enabled: isEditMode,
  });

  const clearError = (key: string): void =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  // Business-only form; a barista landing here goes back to the feed.
  useEffect(() => {
    if (user && user.accountType !== "business") router.replace("/jobs");
  }, [user, router]);

  // Single-branch auto-select (create mode parity with mobile).
  useEffect(() => {
    if (!isEditMode && !selectedBranchId && branches.length === 1) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, isEditMode, selectedBranchId]);

  // In create mode a branch choice seeds the equipment list from the branch.
  useEffect(() => {
    if (isEditMode || !selectedBranchId) return;
    const branch = branches.find((b) => b.id === selectedBranchId);
    if (branch) setSelectedEquipment(branch.equipment ?? []);
  }, [selectedBranchId, branches, isEditMode]);

  // Edit mode: map the loaded job back into form state exactly once.
  useEffect(() => {
    const job = editJobQuery.data;
    if (!isEditMode || !job || prefilled) return;
    if (job.status !== "open") {
      getPlatform().alert.show(
        t("createJob.errors.validationTitle"),
        t("createJob.errors.onlyOpenEditable"),
        [{ text: t("common.ok") }],
      );
      router.replace(`/jobs/${job.id}`);
      return;
    }
    setPrefilled(true);
    setJobType(job.jobType);
    setSelectedBranchId(job.branchId ?? "");
    setTitle(job.title);
    setDescription(job.description ?? "");
    setRequirements(job.requirements.length > 0 ? job.requirements : [""]);
    setSelectedEquipment(job.requiredEquipmentExperience as Equipment[]);
    setCompensationType(job.compensation.type);
    setCompensationAmount(String(job.compensation.amount));
    setSelectedTags(job.tags ?? []);
    const shift = job.shiftDetails;
    if (shift.startDate) setStartDate(toIsoDay(new Date(shift.startDate)));
    else setStartDate("");
    if (shift.kind === "permanent") {
      setHoursPerWeek(
        typeof shift.hoursPerWeek === "number"
          ? String(shift.hoursPerWeek)
          : "",
      );
      setPreferredDayIdxs(
        (shift.preferredDays ?? [])
          .map((d) => WEEKDAY_KEYS.indexOf(d))
          .filter((i) => i >= 0),
      );
      setCustomSchedulePatterns(shift.customSchedulePatterns ?? []);
      setScheduleStartTime(shift.scheduleStartTime ?? "");
      setScheduleEndTime(shift.scheduleEndTime ?? "");
      setSalesBonusPercent(
        job.compensation.salesBonusPercent != null
          ? String(job.compensation.salesBonusPercent)
          : "",
      );
    } else {
      setEndDate(shift.endDate ? toIsoDay(new Date(shift.endDate)) : "");
      setStartTime(shift.startTime ?? nowTime());
      setEndTime(shift.endTime ?? nowTime());
      setIsRecurring(Boolean(shift.isRecurring));
      setSelectedDays(
        (shift.recurringDays ?? [])
          .map((d) => DAY_NAMES.indexOf(d))
          .filter((i) => i >= 0),
      );
      setCustomSchedulePatterns(shift.customSchedulePatterns ?? []);
    }
  }, [editJobQuery.data, isEditMode, prefilled, router, t]);

  const filteredPatterns = (): string[] =>
    customSchedulePatterns
      .map((p) => parseSchedulePattern(p))
      .filter((p) => p.on.length > 0 && p.off.length > 0)
      .map((p) => `${p.on}/${p.off}`);

  const buildShiftDetails = (): ShiftDetails => {
    if (jobType === "permanent") {
      const parsedHours = parseFloat(hoursPerWeek);
      return {
        kind: "permanent",
        startDate: startDate
          ? new Date(`${startDate}T00:00:00`).toISOString()
          : undefined,
        hoursPerWeek: Number.isNaN(parsedHours) ? undefined : parsedHours,
        preferredDays:
          preferredDayIdxs.length > 0
            ? preferredDayIdxs.map((i) => WEEKDAY_KEYS[i])
            : undefined,
        customSchedulePatterns: filteredPatterns(),
        scheduleStartTime:
          scheduleStartTime && scheduleEndTime ? scheduleStartTime : undefined,
        scheduleEndTime:
          scheduleStartTime && scheduleEndTime ? scheduleEndTime : undefined,
      };
    }
    return {
      kind: "temporary",
      startDate: new Date(
        `${startDate || toIsoDay(new Date())}T00:00:00`,
      ).toISOString(),
      endDate: endDate
        ? new Date(`${endDate}T00:00:00`).toISOString()
        : undefined,
      startTime,
      endTime,
      isRecurring,
      recurringDays: isRecurring
        ? selectedDays.map((i) => DAY_NAMES[i])
        : undefined,
      customSchedulePatterns: filteredPatterns(),
    };
  };

  const payment = useMemo(() => {
    const amount = parseFloat(compensationAmount) || 0;
    let totalAmount = amount;
    let totalHours: number | undefined;
    if (jobType === "temporary" && compensationType === "hourly" && amount) {
      totalHours = computeShiftHours({
        kind: "temporary",
        startDate: new Date(
          `${startDate || toIsoDay(new Date())}T00:00:00`,
        ).toISOString(),
        endDate: endDate
          ? new Date(`${endDate}T00:00:00`).toISOString()
          : undefined,
        startTime,
        endTime,
        isRecurring,
        recurringDays: isRecurring
          ? selectedDays.map((i) => DAY_NAMES[i])
          : undefined,
      });
      totalAmount = amount * totalHours;
    }
    const platformFee = totalAmount * PLATFORM_FEE_RATE;
    return {
      totalHours,
      totalAmount,
      platformFee,
      totalWithFee: totalAmount + platformFee,
    };
  }, [
    compensationAmount,
    compensationType,
    jobType,
    startDate,
    endDate,
    startTime,
    endTime,
    isRecurring,
    selectedDays,
  ]);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!selectedBranchId) next.branch = t("createJob.errors.branchRequired");
    if (!title.trim()) next.title = t("createJob.errors.titleRequired");
    const amount = parseFloat(compensationAmount);
    if (!compensationAmount || Number.isNaN(amount) || amount <= 0) {
      next.compensation = t("createJob.errors.compensationRequired");
    }
    if (jobType === "temporary") {
      if (!startDate) {
        next.startDate = t("createJob.errors.startDateInPast");
      } else {
        const start = new Date(`${startDate}T00:00:00`);
        if (start < jobMinDate()) {
          next.startDate = t("createJob.errors.startDateInPast");
        } else if (start > jobMaxDate()) {
          next.startDate = t("createJob.errors.startDateTooFar");
        }
      }
      if (endDate && new Date(`${endDate}T00:00:00`) > jobMaxDate()) {
        next.endDate = t("createJob.errors.endDateTooFar");
      }
      if (isRecurring && selectedDays.length === 0) {
        next.recurringDays = t("createJob.errors.recurringDaysRequired");
      }
      const singleDay = !endDate || endDate === startDate;
      if (singleDay && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        next.endTime = t("createJob.errors.endTimeDiffersFromStart");
      }
    } else {
      if (hoursPerWeek.trim()) {
        const hours = parseFloat(hoursPerWeek);
        if (
          Number.isNaN(hours) ||
          hours < HOURS_PER_WEEK_MIN ||
          hours > HOURS_PER_WEEK_MAX
        ) {
          next.hoursPerWeek = t("createJob.errors.hoursPerWeekInvalid", {
            min: HOURS_PER_WEEK_MIN,
            max: HOURS_PER_WEEK_MAX,
          });
        }
      }
      if (Boolean(scheduleStartTime) !== Boolean(scheduleEndTime)) {
        next.scheduleTimes = t("createJob.errors.scheduleTimesIncomplete");
      } else if (
        scheduleStartTime &&
        scheduleEndTime &&
        timeToMinutes(scheduleEndTime) <= timeToMinutes(scheduleStartTime)
      ) {
        next.scheduleTimes = t("createJob.errors.scheduleTimesInvalid");
      }
      const hasSignal =
        Boolean(hoursPerWeek.trim()) ||
        preferredDayIdxs.length > 0 ||
        filteredPatterns().length > 0 ||
        Boolean(scheduleStartTime && scheduleEndTime);
      if (!hasSignal) {
        next.permanentSchedule = t(
          "createJob.errors.permanentScheduleRequired",
        );
      }
      if (salesBonusPercent.trim()) {
        const percent = Number(salesBonusPercent);
        if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
          next.salesBonus = t("createJob.errors.salesBonusPercentInvalid");
        }
      }
    }
    return next;
  };

  const handleSave = async (): Promise<void> => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      window.scrollTo({ top: 0 });
      return;
    }
    if (!user?.id || !business) return;
    const selectedBranch = branches.find((b) => b.id === selectedBranchId);
    if (!selectedBranch) {
      setErrors({ branch: t("createJob.errors.branchNotFound") });
      return;
    }
    setIsSaving(true);
    try {
      const amount = parseFloat(compensationAmount);
      const base: Omit<CreateJobData, "businessId" | "businessOwnerId"> = {
        branchId: selectedBranchId,
        jobType,
        title: title.trim(),
        description: description.trim() || undefined,
        requirements: requirements.map((r) => r.trim()).filter((r) => r !== ""),
        requiredEquipmentExperience: selectedEquipment,
        location: {
          address: selectedBranch.address,
          city: selectedBranch.city,
          coordinates: selectedBranch.coordinates,
          metroStation: selectedBranch.metroStation,
        },
        shiftDetails: buildShiftDetails(),
        compensation: {
          type: compensationType,
          amount,
          currency: "RUB",
          salesBonusPercent:
            jobType === "permanent" && salesBonusPercent.trim()
              ? Number(salesBonusPercent)
              : undefined,
        },
        payment: {
          hourlyRate:
            jobType === "temporary" && compensationType === "hourly"
              ? amount
              : undefined,
          totalHours:
            jobType === "temporary" && compensationType === "hourly"
              ? payment.totalHours
              : undefined,
          totalAmount: payment.totalAmount,
        },
        tags: selectedTags,
      };
      if (isEditMode) {
        await JobService.updateJob(editJobId as string, base, user.id);
      } else {
        // createJob accepts Partial<Job>; platformFee/totalWithFee are
        // computed server-side from payment.totalAmount.
        await JobService.createJob({
          ...base,
          businessId: business.id,
          businessOwnerId: user.id,
        } as Partial<Job>);
      }
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      getPlatform().alert.show(
        t("common.success"),
        t(isEditMode ? "createJob.updatedSuccess" : "createJob.createdSuccess"),
        [{ text: t("common.ok") }],
      );
      router.push(isEditMode ? `/jobs/${editJobId}` : "/dashboard");
    } catch (e) {
      console.error("Error saving job:", e);
      setErrors({
        submit: t(
          isEditMode
            ? "createJob.errors.updateFailed"
            : "createJob.errors.createFailed",
        ),
      });
      setIsSaving(false);
    }
  };

  const isLoading =
    businessQuery.isPending ||
    branchesQuery.isPending ||
    (isEditMode && editJobQuery.isPending);

  if (user && user.accountType !== "business") {
    return <></>;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-96 animate-pulse rounded-card bg-bg-secondary" />
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-lg font-semibold">
          {t("createJob.branchesEmptyTitle")}
        </p>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("createJob.branchesEmptySubtitle")}
        </p>
        <Link
          href="/branches"
          className="mt-4 inline-block rounded-card bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("branches.add")}
        </Link>
      </div>
    );
  }

  const dayChips = (
    selected: number[],
    onToggle: (idx: number) => void,
  ): React.JSX.Element => (
    <div className="flex flex-wrap gap-2">
      {WEEKDAY_KEYS.map((key, idx) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(idx)}
          className={chip(selected.includes(idx))}
        >
          {t(`createJob.weekdays.${key}`)}
        </button>
      ))}
    </div>
  );

  const toggleIdx = (
    list: number[],
    set: (next: number[]) => void,
    idx: number,
  ): void =>
    set(list.includes(idx) ? list.filter((i) => i !== idx) : [...list, idx]);

  const fieldError = (key: string): React.JSX.Element | null =>
    errors[key] ? (
      <p role="alert" className="text-xs text-error">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="mb-4 text-2xl font-bold">
        {t(isEditMode ? "createJob.titleEdit" : "createJob.titleCreate")}
      </h1>

      <div className="flex flex-col gap-5 rounded-card border border-line bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("createJob.sections.jobType")}</span>
          <div className="flex gap-2">
            {(["temporary", "permanent"] as JobType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setJobType(type)}
                className={chip(jobType === type)}
              >
                {t(`createJob.jobType.${type}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("createJob.fields.branch")}</span>
          <div className="flex flex-col gap-2">
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                disabled={isEditMode}
                onClick={() => {
                  setSelectedBranchId(branch.id);
                  clearError("branch");
                }}
                className={`rounded-input border px-3 py-2 text-left text-sm disabled:opacity-60 ${
                  selectedBranchId === branch.id
                    ? "border-primary bg-primary/5"
                    : "border-line"
                }`}
              >
                <span className="block font-medium">{branch.name}</span>
                <span className="block text-xs text-ink-secondary">
                  {branch.address}
                </span>
              </button>
            ))}
          </div>
          {fieldError("branch")}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("createJob.fields.title")}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH));
              clearError("title");
            }}
            placeholder={t("createJob.fields.titlePlaceholder")}
            className={inputClass(Boolean(errors.title))}
          />
          {fieldError("title")}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>
            {t("createJob.fields.description")}
          </span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) =>
              setDescription(
                clampToEffectiveLength(e.target.value, DESCRIPTION_MAX_LENGTH),
              )
            }
            placeholder={t("createJob.fields.descriptionPlaceholder")}
            className={inputClass()}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>
            {t("createJob.fields.requirements")}
          </span>
          {requirements.map((req, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={req}
                onChange={(e) =>
                  setRequirements(
                    requirements.map((r, i) =>
                      i === index
                        ? e.target.value.slice(0, SHORT_TEXT_MAX_LENGTH)
                        : r,
                    ),
                  )
                }
                placeholder={t("createJob.fields.requirementPlaceholder", {
                  index: index + 1,
                })}
                className={`flex-1 ${inputClass()}`}
              />
              {requirements.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setRequirements(requirements.filter((_, i) => i !== index))
                  }
                  className="text-sm font-medium text-error"
                >
                  {t("createJob.fields.removeRequirement")}
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRequirements([...requirements, ""])}
            className="self-start text-sm font-medium text-primary"
          >
            {t("createJob.fields.addRequirement")}
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("createJob.fields.equipment")}</span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_TYPES.map((equipment) => (
              <button
                key={equipment}
                type="button"
                onClick={() =>
                  setSelectedEquipment(
                    selectedEquipment.includes(equipment)
                      ? selectedEquipment.filter((e) => e !== equipment)
                      : [...selectedEquipment, equipment],
                  )
                }
                className={chip(selectedEquipment.includes(equipment))}
              >
                {equipment}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <span className="text-base font-semibold">
            {t("createJob.sections.shiftDetails")}
          </span>

          {jobType === "temporary" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>
                    {t("createJob.fields.startDate")}
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    min={toIsoDay(jobMinDate())}
                    max={toIsoDay(jobMaxDate())}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value > endDate) setEndDate("");
                      clearError("startDate");
                    }}
                    className={inputClass(Boolean(errors.startDate))}
                  />
                  {fieldError("startDate")}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>
                    {t("createJob.fields.endDate")}
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || toIsoDay(jobMinDate())}
                    max={toIsoDay(jobMaxDate())}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      clearError("endDate");
                    }}
                    className={inputClass(Boolean(errors.endDate))}
                  />
                  {fieldError("endDate")}
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>
                    {t("createJob.fields.startTime")}
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      clearError("endTime");
                    }}
                    className={inputClass()}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>
                    {t("createJob.fields.endTime")}
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      clearError("endTime");
                    }}
                    className={inputClass(Boolean(errors.endTime))}
                  />
                  {fieldError("endTime")}
                </label>
              </div>
              <label className="flex items-center justify-between text-sm">
                {t("createJob.fields.isRecurring")}
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
              {isRecurring && (
                <div className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>
                    {t("createJob.fields.recurringDays")}
                  </span>
                  {dayChips(selectedDays, (idx) => {
                    toggleIdx(selectedDays, setSelectedDays, idx);
                    clearError("recurringDays");
                  })}
                  {fieldError("recurringDays")}
                </div>
              )}
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>
                  {t("createJob.fields.permanentStartDate")}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    min={toIsoDay(jobMinDate())}
                    max={toIsoDay(jobMaxDate())}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`flex-1 ${inputClass()}`}
                  />
                  {startDate && (
                    <button
                      type="button"
                      onClick={() => setStartDate("")}
                      className="text-sm font-medium text-primary"
                    >
                      {t("createJob.fields.clearDate")}
                    </button>
                  )}
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>
                  {t("createJob.fields.hoursPerWeek")}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={hoursPerWeek}
                  onChange={(e) => {
                    setHoursPerWeek(sanitizeHoursPerWeekInput(e.target.value));
                    clearError("hoursPerWeek");
                    clearError("permanentSchedule");
                  }}
                  placeholder={t("createJob.fields.hoursPerWeekPlaceholder")}
                  className={inputClass(Boolean(errors.hoursPerWeek))}
                />
                {fieldError("hoursPerWeek")}
              </label>
              <div className="flex flex-col gap-1.5">
                <span className={fieldLabel}>
                  {t("createJob.fields.preferredDays")}
                </span>
                <span className="text-xs text-ink-secondary">
                  {t("createJob.fields.preferredDaysHint")}
                </span>
                {dayChips(preferredDayIdxs, (idx) => {
                  toggleIdx(preferredDayIdxs, setPreferredDayIdxs, idx);
                  clearError("permanentSchedule");
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={fieldLabel}>
                  {t("createJob.fields.scheduleStartTime")} /{" "}
                  {t("createJob.fields.scheduleEndTime")}
                </span>
                <span className="text-xs text-ink-secondary">
                  {t("createJob.fields.scheduleTimesHint")}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={scheduleStartTime}
                    onChange={(e) => {
                      setScheduleStartTime(e.target.value);
                      clearError("scheduleTimes");
                      clearError("permanentSchedule");
                    }}
                    className={inputClass(Boolean(errors.scheduleTimes))}
                  />
                  <span className="text-ink-secondary">—</span>
                  <input
                    type="time"
                    value={scheduleEndTime}
                    onChange={(e) => {
                      setScheduleEndTime(e.target.value);
                      clearError("scheduleTimes");
                      clearError("permanentSchedule");
                    }}
                    className={inputClass(Boolean(errors.scheduleTimes))}
                  />
                  {(scheduleStartTime || scheduleEndTime) && (
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleStartTime("");
                        setScheduleEndTime("");
                        clearError("scheduleTimes");
                      }}
                      className="text-sm font-medium text-primary"
                    >
                      {t("createJob.fields.clearDate")}
                    </button>
                  )}
                </div>
                {fieldError("scheduleTimes")}
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <span className={fieldLabel}>
              {t("createJob.fields.customSchedule")}
            </span>
            <span className="text-xs text-ink-secondary">
              {t("createJob.fields.customScheduleHint")}
            </span>
            {customSchedulePatterns.map((pattern, index) => {
              const parts = parseSchedulePattern(pattern);
              const setPart = (on: string, off: string): void =>
                setCustomSchedulePatterns(
                  customSchedulePatterns.map((p, i) =>
                    i === index ? `${on}/${off}` : p,
                  ),
                );
              return (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={parts.on}
                    onChange={(e) =>
                      setPart(
                        e.target.value.replace(/\D/g, "").slice(0, 1),
                        parts.off,
                      )
                    }
                    className={`w-14 text-center ${inputClass()}`}
                  />
                  <span className="text-ink-secondary">/</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={parts.off}
                    onChange={(e) =>
                      setPart(
                        parts.on,
                        e.target.value.replace(/\D/g, "").slice(0, 1),
                      )
                    }
                    className={`w-14 text-center ${inputClass()}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCustomSchedulePatterns(
                        customSchedulePatterns.filter((_, i) => i !== index),
                      )
                    }
                    className="text-sm font-medium text-error"
                  >
                    {t("createJob.fields.removeRequirement")}
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setCustomSchedulePatterns([...customSchedulePatterns, "/"]);
                clearError("permanentSchedule");
              }}
              className="self-start text-sm font-medium text-primary"
            >
              {t("createJob.fields.addCustomSchedule")}
            </button>
          </div>
          {fieldError("permanentSchedule")}
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <span className="text-base font-semibold">
            {t("createJob.sections.compensation")}
          </span>
          <div className="flex flex-col gap-1.5">
            <span className={fieldLabel}>
              {t("createJob.fields.compensationType")}
            </span>
            <div className="flex gap-2">
              {(["hourly", "daily", "fixed"] as CompensationType[]).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (type !== compensationType) {
                        setCompensationType(type);
                        setCompensationAmount("");
                      }
                    }}
                    className={chip(compensationType === type)}
                  >
                    {t(`createJob.compensationOption.${type}`)}
                  </button>
                ),
              )}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>
              {t("createJob.fields.amountRub")}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={compensationAmount}
              onChange={(e) => {
                setCompensationAmount(
                  sanitizeDigitsInput(e.target.value, COMPENSATION_MAX_DIGITS),
                );
                clearError("compensation");
              }}
              placeholder={t("createJob.fields.amountPlaceholder")}
              className={inputClass(Boolean(errors.compensation))}
            />
            {fieldError("compensation")}
          </label>
          {jobType === "permanent" && (
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>
                {t("createJob.fields.salesBonusPercent")}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={salesBonusPercent}
                onChange={(e) => {
                  setSalesBonusPercent(sanitizePercentInput(e.target.value));
                  clearError("salesBonus");
                }}
                placeholder={t("createJob.fields.salesBonusPlaceholder")}
                className={inputClass(Boolean(errors.salesBonus))}
              />
              <span className="text-xs text-ink-secondary">
                {t("createJob.fields.salesBonusHint")}
              </span>
              {fieldError("salesBonus")}
            </label>
          )}

          {jobType === "temporary" &&
            compensationType === "hourly" &&
            payment.totalHours != null && (
              <div className="rounded-input bg-bg-secondary p-3 text-sm">
                <p className="mb-1 font-semibold">
                  {t("createJob.sections.paymentSummary")}
                </p>
                <p>
                  {t("createJob.paymentSummary.totalHours", {
                    hours: payment.totalHours.toFixed(2),
                  })}
                </p>
                <p>
                  {t("createJob.paymentSummary.totalAmount", {
                    amount: payment.totalAmount.toFixed(2),
                  })}
                </p>
                {SHOW_PLATFORM_FEE && (
                  <>
                    <p>
                      {t("createJob.paymentSummary.platformFee", {
                        amount: payment.platformFee.toFixed(2),
                      })}
                    </p>
                    <p>
                      {t("createJob.paymentSummary.totalWithFee", {
                        amount: payment.totalWithFee.toFixed(2),
                      })}
                    </p>
                  </>
                )}
              </div>
            )}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-line pt-4">
          <span className={fieldLabel}>{t("createJob.fields.tags")}</span>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setSelectedTags(
                    selectedTags.includes(tag)
                      ? selectedTags.filter((v) => v !== tag)
                      : [...selectedTags, tag],
                  )
                }
                className={chip(selectedTags.includes(tag))}
              >
                {t(`createJob.tags.${tag}`, { defaultValue: tag })}
              </button>
            ))}
          </div>
        </div>

        {errors.submit && (
          <p role="alert" className="text-sm text-error">
            {errors.submit}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="rounded-card bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving
            ? t("baristaProfileScreen.saving")
            : t(isEditMode ? "createJob.actionSave" : "createJob.actionCreate")}
        </button>
      </div>
    </div>
  );
}
