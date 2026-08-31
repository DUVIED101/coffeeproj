"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { getPlatform } from "@bystrobarista/core/platform";
import { BaristaProfileService } from "@bystrobarista/core/services/BaristaProfileService";
import { WorkExperienceService } from "@bystrobarista/core/services/WorkExperienceService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { EQUIPMENT_CATEGORIES } from "@bystrobarista/core/config/constants";
import { METRO_ANY } from "@bystrobarista/core/config/metroFilter";
import {
  DAYS_OF_WEEK,
  WORKLOAD_TYPES,
  type BaristaProfile,
  type DayOfWeek,
  type ShiftTime,
  type WorkloadType,
} from "@bystrobarista/core/types/baristaProfile";
import {
  DEFAULT_CITY,
  toCityCode,
  type CityCode,
} from "@bystrobarista/core/types/city";
import type { BaristaProfileId } from "@bystrobarista/core/types/ids";
import type { GeoPoint } from "@bystrobarista/core/types/business";
import {
  findDraftErrors,
  type WorkExperienceDraft,
  type WorkExperienceFieldError,
} from "@bystrobarista/core/types/workExperience";
import { dobMaxDate, dobMinDate } from "@bystrobarista/core/utils/dateRanges";
import {
  getCurrentLocation,
  requestLocationPermission,
} from "@bystrobarista/core/utils/geolocation";
import {
  SHORT_TEXT_MAX_LENGTH,
  sanitizeDigitsInput,
  sanitizeNameInput,
  sanitizeYearsInput,
} from "@bystrobarista/core/utils/validation";
import { MetroFilterModal } from "@/components/MetroFilterModal";
import { WorkExperienceEditor } from "@/components/WorkExperienceEditor";
import { TextField } from "@/components/ui/TextField";
import { BusinessProfileForm } from "@/components/BusinessProfileForm";

const STEPS = [
  "stepBasicInfo",
  "stepProfessional",
  "stepPreferences",
  "stepPortfolio",
  "stepWorkExperience",
] as const;

const SHIFT_TIMES: ShiftTime[] = ["morning", "afternoon", "evening", "night"];

const BIO_MAX = 500;
const RATE_MAX_DIGITS = 6;

const toIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const chip = (active: boolean): string =>
  `rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
    active
      ? "border-primary bg-primary text-white"
      : "border-line bg-white text-ink"
  }`;

const sectionLabel = "text-sm font-medium text-ink";

// Web port of mobile's BaristaProfileSetupScreen: a 5-step wizard (basic info,
// professional, preferences, certificates, work experience). Same save
// semantics — one createProfile/updateProfile call at the end plus
// WorkExperienceService.replaceAll; certificates persist immediately only in
// edit mode. profile_completeness is computed by a DB trigger.
// Shared route: barista gets the 5-step wizard, business the profile form.
export default function ProfileEditPage(): React.JSX.Element {
  const accountType = useAuthStore((s) => s.user?.accountType);
  if (accountType === "business") return <BusinessProfileForm />;
  return <BaristaProfileEditWizard />;
}

function BaristaProfileEditWizard(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<BaristaProfile | null>(
    null,
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState<CityCode>(DEFAULT_CITY);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [medicalBookExpiresOn, setMedicalBookExpiresOn] = useState("");
  const [preferredMetroStations, setPreferredMetroStations] = useState<
    string[]
  >([]);
  const [selectedShiftTimes, setSelectedShiftTimes] = useState<ShiftTime[]>([]);
  const [hourlyRateMin, setHourlyRateMin] = useState("");
  const [availableFromDate, setAvailableFromDate] = useState("");
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>([]);
  const [workloadTypes, setWorkloadTypes] = useState<WorkloadType[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certDraft, setCertDraft] = useState("");
  const [workExperiences, setWorkExperiences] = useState<WorkExperienceDraft[]>(
    [],
  );
  const [workExperienceErrors, setWorkExperienceErrors] = useState<
    ReadonlyArray<ReadonlyArray<WorkExperienceFieldError>>
  >([]);
  const [metroOpen, setMetroOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | undefined>(
    undefined,
  );

  const isBarista = user?.accountType === "barista";

  useEffect(() => {
    let cancelled = false;
    const locate = async (): Promise<void> => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission || cancelled) return;
      const location = await getCurrentLocation();
      if (location && !cancelled) setUserLocation(location);
    };
    void locate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await BaristaProfileService.getProfileByUserId(user.id);
        if (cancelled) return;
        if (profile) {
          setExistingProfile(profile);
          setFirstName(profile.firstName);
          setLastName(profile.lastName);
          setCity(toCityCode(profile.city));
          setDateOfBirth(profile.dateOfBirth ?? "");
          setBio(profile.bio ?? "");
          setYearsOfExperience(
            profile.yearsOfExperience != null
              ? String(profile.yearsOfExperience)
              : "",
          );
          setSelectedEquipment(profile.equipmentExperience);
          setCertifications(profile.certifications);
          setPreferredMetroStations(profile.preferredMetroStations);
          setSelectedShiftTimes(profile.preferredShiftTimes);
          setHourlyRateMin(
            profile.hourlyRateMin != null ? String(profile.hourlyRateMin) : "",
          );
          setMedicalBookExpiresOn(profile.medicalBookExpiresOn ?? "");
          setAvailableFromDate(profile.availableFromDate ?? "");
          setAvailableDays(profile.availableDays ?? []);
          setWorkloadTypes(profile.workloadTypes ?? []);
          const experiences = await WorkExperienceService.listForProfile(
            profile.id as BaristaProfileId,
          );
          if (cancelled) return;
          setWorkExperiences(
            experiences.map((e) => ({
              id: e.id,
              employer: e.employer,
              position: e.position,
              startYear: e.startYear,
              startMonth: e.startMonth,
              endYear: e.endYear,
              endMonth: e.endMonth,
              isCurrent: e.isCurrent,
              description: e.description,
            })),
          );
        }
      } catch (e) {
        console.error("Error loading existing profile:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const handleCityChange = (next: CityCode): void => {
    if (next === city) return;
    setCity(next);
    setPreferredMetroStations([]);
  };

  const persistCertifications = async (next: string[]): Promise<void> => {
    const prev = certifications;
    setCertifications(next);
    if (!existingProfile || !user?.id) return;
    try {
      await BaristaProfileService.setCertifications(user.id, next);
    } catch {
      setCertifications(prev);
      setError(t("baristaSetup.errorSaveCert"));
    }
  };

  const addCertificate = (): void => {
    const name = certDraft.trim().slice(0, SHORT_TEXT_MAX_LENGTH);
    if (!name) return;
    if (certifications.includes(name)) {
      window.alert(t("certificatesEditor.duplicateBody", { name }));
      return;
    }
    setCertDraft("");
    void persistCertifications([...certifications, name]);
  };

  const removeCertificate = (name: string): void => {
    if (!window.confirm(t("certificatesEditor.removeBody", { name }))) return;
    void persistCertifications(certifications.filter((c) => c !== name));
  };

  const validateStep = (step: number): boolean => {
    if (step === 0 && (!firstName.trim() || !lastName.trim())) {
      setError(t("baristaSetup.validationRequired"));
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = (): void => {
    if (!validateStep(currentStep)) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0 });
    } else {
      void handleSubmit();
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!user?.id) return;
    const draftErrors = workExperiences.map(findDraftErrors);
    if (draftErrors.some((e) => e.length > 0)) {
      setWorkExperienceErrors(draftErrors);
      setError(t("barista.workExperience.errors.fillRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const profileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city,
        dateOfBirth: dateOfBirth || undefined,
        bio: bio.trim() || undefined,
        yearsOfExperience: yearsOfExperience
          ? parseFloat(yearsOfExperience)
          : undefined,
        equipmentExperience: selectedEquipment,
        certifications,
        languages: ["Russian"],
        preferredMetroStations,
        preferredShiftTimes: selectedShiftTimes,
        hourlyRateMin: hourlyRateMin ? parseInt(hourlyRateMin, 10) : undefined,
        medicalBookExpiresOn: medicalBookExpiresOn || undefined,
        availableFromDate: availableFromDate || undefined,
        availableDays,
        workloadTypes,
      };
      const profile = existingProfile
        ? await BaristaProfileService.updateProfile(user.id, profileData)
        : await BaristaProfileService.createProfile({
            userId: user.id,
            ...profileData,
          });
      await WorkExperienceService.replaceAll(
        profile.id as BaristaProfileId,
        workExperiences,
      );
      await queryClient.invalidateQueries({ queryKey: ["baristaProfile"] });
      getPlatform().alert.show(
        t("baristaSetup.successTitle"),
        t(
          existingProfile
            ? "baristaSetup.successUpdated"
            : "baristaSetup.successCreated",
        ),
        [{ text: t("common.ok") }],
      );
      router.push("/profile");
    } catch (e) {
      console.error("Error saving barista profile:", e);
      setError(t("baristaSetup.errorCreate"));
      setSaving(false);
    }
  };

  if (!user || !isBarista) return <></>;

  if (isLoading) {
    return (
      <p className="py-16 text-center text-sm text-ink-secondary">
        {t("baristaSetup.loadingProfile")}
      </p>
    );
  }

  const metroCount = preferredMetroStations.filter(
    (s) => s !== METRO_ANY,
  ).length;
  const metroLabel = preferredMetroStations.includes(METRO_ANY)
    ? t("metro.anyOptionTitle")
    : metroCount > 0
      ? t("metro.selectedCount", { count: metroCount })
      : t("metro.titleMulti");

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="text-2xl font-bold">
        {t(
          existingProfile
            ? "baristaSetup.editTitle"
            : "baristaSetup.createTitle",
        )}
      </h1>
      <p className="mt-1 text-sm text-ink-secondary">
        {t(
          existingProfile
            ? "baristaSetup.editSubtitle"
            : "baristaSetup.createSubtitle",
        )}
      </p>

      <ol className="mt-4 flex items-center gap-1">
        {STEPS.map((step, i) => (
          <li key={step} className="flex flex-1 flex-col items-center gap-1">
            <span
              aria-current={i === currentStep ? "step" : undefined}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i <= currentStep
                  ? "bg-primary text-white"
                  : "bg-bg-secondary text-ink-secondary"
              }`}
            >
              {i + 1}
            </span>
            <span className="hidden text-center text-[11px] text-ink-secondary sm:block">
              {t(`baristaSetup.${step}`)}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-card border border-line bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold">
          {t(`baristaSetup.step${currentStep + 1}Title`)}
        </h2>
        <p className="mb-4 mt-1 text-sm text-ink-secondary">
          {t(`baristaSetup.step${currentStep + 1}Subtitle`)}
        </p>

        {currentStep === 0 && (
          <div className="flex flex-col gap-4">
            <TextField
              id="firstName"
              label={t("baristaSetup.fieldFirstName")}
              value={firstName}
              onChange={(v) => setFirstName(sanitizeNameInput(v))}
              placeholder={t("baristaSetup.fieldFirstNamePlaceholder")}
            />
            <TextField
              id="lastName"
              label={t("baristaSetup.fieldLastName")}
              value={lastName}
              onChange={(v) => setLastName(sanitizeNameInput(v))}
              placeholder={t("baristaSetup.fieldLastNamePlaceholder")}
            />
            <div className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldCity")}
              </span>
              <div className="flex gap-2">
                {(["spb", "moscow"] as CityCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleCityChange(code)}
                    className={chip(city === code)}
                  >
                    {t(`city.codes.${code}`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldDateOfBirth")}
              </span>
              <input
                type="date"
                value={dateOfBirth}
                min={toIso(dobMinDate())}
                max={toIso(dobMaxDate())}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className={sectionLabel}>{t("baristaSetup.fieldBio")}</span>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder={t("baristaSetup.fieldBioPlaceholder")}
                className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <span className="text-right text-xs text-ink-secondary">
                {t("baristaSetup.fieldBioCounter", { count: bio.length })}
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldYearsExperience")}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={yearsOfExperience}
                onChange={(e) =>
                  setYearsOfExperience(sanitizeYearsInput(e.target.value))
                }
                placeholder={t("baristaSetup.fieldYearsExperiencePlaceholder")}
                className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldEquipment")}
              </span>
              {EQUIPMENT_CATEGORIES.map((category) => (
                <div key={category.key} className="mt-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                    {t(`equipmentCategories.${category.key}`)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.brands.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() =>
                          setSelectedEquipment(
                            toggleIn(selectedEquipment, brand),
                          )
                        }
                        className={chip(selectedEquipment.includes(brand))}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <label className="flex flex-col gap-1">
              <span className={sectionLabel}>{t("medicalBook.label")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={medicalBookExpiresOn}
                  min={toIso(new Date())}
                  onChange={(e) => setMedicalBookExpiresOn(e.target.value)}
                  className="flex-1 rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {medicalBookExpiresOn && (
                  <button
                    type="button"
                    onClick={() => setMedicalBookExpiresOn("")}
                    className="text-sm font-medium text-primary"
                  >
                    {t("common.clear")}
                  </button>
                )}
              </div>
              <span className="text-xs text-ink-secondary">
                {t("medicalBook.helper")}
              </span>
            </label>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldMetro")}
              </span>
              <button
                type="button"
                onClick={() => setMetroOpen(true)}
                className="rounded-input border border-line px-3 py-2 text-left text-sm hover:border-primary"
              >
                Ⓜ {metroLabel}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldShiftTimes")}
              </span>
              <div className="flex flex-wrap gap-2">
                {SHIFT_TIMES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setSelectedShiftTimes(toggleIn(selectedShiftTimes, value))
                    }
                    className={chip(selectedShiftTimes.includes(value))}
                  >
                    {t(`shiftTimes.${value}Range`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldHourlyRateMin")}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={hourlyRateMin}
                onChange={(e) =>
                  setHourlyRateMin(
                    sanitizeDigitsInput(e.target.value, RATE_MAX_DIGITS),
                  )
                }
                placeholder={t("baristaSetup.minPlaceholder")}
                className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldAvailableFrom")}
              </span>
              <input
                type="date"
                value={availableFromDate}
                min={toIso(new Date())}
                onChange={(e) => setAvailableFromDate(e.target.value)}
                className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldWorkloadTypes")}
              </span>
              <div className="flex flex-wrap gap-2">
                {WORKLOAD_TYPES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setWorkloadTypes(toggleIn(workloadTypes, value))
                    }
                    className={chip(workloadTypes.includes(value))}
                  >
                    {t(`workloadType.${value}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className={sectionLabel}>
                {t("baristaSetup.fieldAvailableDays")}
              </span>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setAvailableDays(toggleIn(availableDays, day))
                    }
                    className={chip(availableDays.includes(day))}
                  >
                    {t(`dayOfWeek.${day}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex flex-col gap-3">
            {certifications.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-input border border-line px-3 py-2"
              >
                <span className="text-sm">{name}</span>
                <button
                  type="button"
                  onClick={() => removeCertificate(name)}
                  aria-label={t("certificatesEditor.removeA11y", { name })}
                  className="text-sm font-medium text-error"
                >
                  {t("common.delete")}
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={certDraft}
                onChange={(e) =>
                  setCertDraft(e.target.value.slice(0, SHORT_TEXT_MAX_LENGTH))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCertificate();
                  }
                }}
                placeholder={t("certificatesEditor.draftPlaceholder")}
                className="flex-1 rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={addCertificate}
                disabled={!certDraft.trim()}
                className="rounded-input border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
              >
                {t("certificatesEditor.addButton")}
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <WorkExperienceEditor
            drafts={workExperiences}
            errors={workExperienceErrors}
            onChange={(next) => {
              setWorkExperiences(next);
              if (workExperienceErrors.length > 0) setWorkExperienceErrors([]);
            }}
          />
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCurrentStep(currentStep - 1);
                window.scrollTo({ top: 0 });
              }}
              className="rounded-card border border-line px-4 py-2.5 text-sm font-medium"
            >
              {t("baristaSetup.back")}
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="flex-1 rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? t("baristaProfileScreen.saving")
              : t(
                  currentStep === STEPS.length - 1
                    ? "baristaSetup.finish"
                    : "baristaSetup.next",
                )}
          </button>
        </div>
      </div>

      <MetroFilterModal
        open={metroOpen}
        city={city}
        value={preferredMetroStations}
        userLocation={userLocation}
        onCityChange={handleCityChange}
        onChange={setPreferredMetroStations}
        onClose={() => setMetroOpen(false)}
      />
    </div>
  );
}
