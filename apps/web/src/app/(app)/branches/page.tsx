"use client";

/* eslint-disable @next/next/no-img-element */

import { useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BusinessService,
  BranchHasActiveJobsError,
  BranchPhotoLimitError,
} from "@bystrobarista/core/services/BusinessService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { EQUIPMENT_TYPES } from "@bystrobarista/core/config/constants";
import type {
  Branch,
  Equipment,
  GeoPoint,
} from "@bystrobarista/core/types/business";
import { DEFAULT_CITY, type CityCode } from "@bystrobarista/core/types/city";
import { MetroService } from "@bystrobarista/core/utils/metro";
import { PHOTO_LIMIT } from "@bystrobarista/core/utils/storage";
import {
  pickPhotos,
  reportRejections,
} from "@bystrobarista/core/utils/pickPhotos";
import {
  ADDRESS_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
} from "@bystrobarista/core/utils/validation";
import { geocodeAddress } from "@/lib/geocode";
import { transformedImageUrl } from "@/lib/imageTransform";

const GEOCODE_DEBOUNCE_MS = 1500;

type LookupStatus = "idle" | "searching" | "found" | "notFound" | "rateLimited";

const chip = (active: boolean): string =>
  `rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
    active
      ? "border-primary bg-primary text-white"
      : "border-line bg-white text-ink"
  }`;

const fieldLabel = "text-sm font-medium text-ink";
const inputClass = (invalid?: boolean): string =>
  `rounded-input border ${invalid ? "border-error" : "border-line"} px-3 py-2 text-sm outline-none focus:border-primary`;

type FormState = {
  editingBranch: Branch | null;
  name: string;
  address: string;
  city: CityCode;
  metroStation: string;
  equipment: Equipment[];
};

const emptyForm = (): FormState => ({
  editingBranch: null,
  name: "",
  address: "",
  city: DEFAULT_CITY,
  metroStation: "",
  equipment: [],
});

// Web port of mobile's BranchManagementScreen: branch list with photo
// galleries, add/edit form with the debounced Yandex geocoder confirmation
// gate, city-scoped metro picker and equipment chips. Deletion is blocked
// while the branch has open jobs (BranchHasActiveJobsError).
export default function BranchesPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  void i18n;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [addressCoords, setAddressCoords] = useState<GeoPoint | null>(null);
  const geocodedKeyRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [uploadingBranchIds, setUploadingBranchIds] = useState<Set<string>>(
    new Set(),
  );

  const businessQuery = useQuery({
    queryKey: ["business", "byOwner", user?.id],
    queryFn: () => BusinessService.getBusinessByOwnerId(user?.id as string),
    enabled: Boolean(user?.id),
  });
  const businessId = businessQuery.data?.id;

  const branchesQuery = useQuery({
    queryKey: ["branches", businessId],
    queryFn: () => BusinessService.getBranches(businessId as string),
    enabled: Boolean(businessId),
  });
  const branches = branchesQuery.data ?? [];

  // /branches?new=1 (from the business-profile wizard) opens the add form.
  useEffect(() => {
    if (searchParams.get("new") === "1" && form === null) {
      setForm(emptyForm());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounced address → coordinates lookup with an abortable request; save
  // stays disabled until the geocoder confirms the current address+city key.
  useEffect(() => {
    if (!form) return;
    const trimmed = form.address.trim();
    if (!trimmed) {
      setLookupStatus("idle");
      setAddressCoords(null);
      return;
    }
    const key = `${trimmed}|${form.city}`;
    if (geocodedKeyRef.current === key) return;
    setLookupStatus("searching");
    setAddressCoords(null);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const outcome = await geocodeAddress(
        trimmed,
        form.city,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (outcome === "rate_limited") {
        setLookupStatus("rateLimited");
      } else if (outcome) {
        geocodedKeyRef.current = `${outcome.formattedAddress}|${form.city}`;
        setAddressCoords({
          latitude: outcome.latitude,
          longitude: outcome.longitude,
        });
        setLookupStatus("found");
        setForm((prev) =>
          prev ? { ...prev, address: outcome.formattedAddress } : prev,
        );
      } else {
        setLookupStatus("notFound");
      }
    }, GEOCODE_DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // Only the address+city matter here — depending on the whole form object
    // would restart the debounce on every unrelated keystroke (name, chips).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.address, form?.city]);

  const openCreate = (): void => {
    geocodedKeyRef.current = null;
    setAddressCoords(null);
    setLookupStatus("idle");
    setFormErrors({});
    setForm(emptyForm());
  };

  const openEdit = (branch: Branch): void => {
    // Existing addresses are treated as already confirmed until edited.
    geocodedKeyRef.current = `${branch.address}|${branch.city}`;
    setAddressCoords(branch.coordinates);
    setLookupStatus("found");
    setFormErrors({});
    setForm({
      editingBranch: branch,
      name: branch.name,
      address: branch.address,
      city: branch.city,
      metroStation: branch.metroStation ?? "",
      equipment: (branch.equipment ?? []) as Equipment[],
    });
  };

  const closeForm = (): void => {
    setForm(null);
    setFormErrors({});
    setLookupStatus("idle");
    setAddressCoords(null);
    geocodedKeyRef.current = null;
  };

  const stations = useMemo(
    () => (form ? MetroService.getAllStations(form.city) : []),
    [form?.city, form],
  );

  const addressConfirmed =
    form !== null &&
    lookupStatus === "found" &&
    addressCoords !== null &&
    geocodedKeyRef.current === `${form.address.trim()}|${form.city}`;

  const handleSave = async (): Promise<void> => {
    if (!form || !businessId) return;
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = t("branches.form.nameRequired");
    if (!form.address.trim())
      errors.address = t("branches.form.addressRequired");
    if (!form.metroStation.trim())
      errors.metro = t("branches.form.metroRequired");
    if (form.address.trim() && !addressConfirmed) {
      errors.address = t("branches.errors.addressNotConfirmed");
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    setPageError(null);
    try {
      if (form.editingBranch) {
        await BusinessService.updateBranch(form.editingBranch.id, {
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city,
          coordinates: addressCoords as GeoPoint,
          metroStation: form.metroStation.trim(),
          equipment: form.equipment,
        });
      } else {
        await BusinessService.createBranch({
          businessId,
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city,
          coordinates: addressCoords as GeoPoint,
          metroStation: form.metroStation.trim(),
          equipment: form.equipment,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      closeForm();
    } catch (e) {
      console.error("Error saving branch:", e);
      setFormErrors({ submit: t("branches.errors.saveFailed") });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (branch: Branch): Promise<void> => {
    if (!window.confirm(t("branches.delete.confirm", { name: branch.name })))
      return;
    setPageError(null);
    try {
      await BusinessService.deleteBranch(branch.id);
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
    } catch (e) {
      if (e instanceof BranchHasActiveJobsError) {
        setPageError(t("branches.errors.hasActiveJobs", { count: e.count }));
      } else {
        setPageError(t("branches.errors.deleteFailed"));
      }
    }
  };

  const markUploading = (branchId: string, value: boolean): void =>
    setUploadingBranchIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(branchId);
      else next.delete(branchId);
      return next;
    });

  const handleAddPhotos = async (branch: Branch): Promise<void> => {
    if (!user?.id) return;
    const remaining = PHOTO_LIMIT - branch.photos.length;
    if (remaining <= 0) {
      window.alert(t("branchPhotos.limitReached", { max: PHOTO_LIMIT }));
      return;
    }
    const picked = await pickPhotos({
      quality: 0.8,
      selectionLimit: remaining,
    });
    if (!picked || !reportRejections(t, picked)) return;
    markUploading(branch.id, true);
    setPageError(null);
    try {
      for (const asset of picked.accepted.slice(0, remaining)) {
        try {
          await BusinessService.addBranchPhoto(branch.id, user.id, asset.uri);
        } catch (e) {
          if (e instanceof BranchPhotoLimitError) {
            setPageError(t("branchPhotos.limitReached", { max: PHOTO_LIMIT }));
            break;
          }
          setPageError(t("photoErrors.uploadFailedBody"));
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
    } finally {
      markUploading(branch.id, false);
    }
  };

  const handleRemovePhoto = async (
    branch: Branch,
    photoUrl: string,
  ): Promise<void> => {
    if (!window.confirm(t("baristaProfileScreen.removePhotoBody"))) return;
    try {
      await BusinessService.removeBranchPhoto(branch.id, photoUrl);
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
    } catch {
      setPageError(t("branchPhotos.removeFailed"));
    }
  };

  const lookupHint: Partial<Record<LookupStatus, string>> = {
    searching: t("branches.form.addressLookup.searching"),
    found: t("branches.form.addressLookup.found"),
    notFound: t("branches.form.addressLookup.notFound"),
    rateLimited: t("branches.form.addressLookup.rateLimited"),
  };

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("branches.title")}</h1>
        {!form && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {t("branches.add")}
          </button>
        )}
      </div>

      {pageError && (
        <p role="alert" className="mb-3 text-sm text-error">
          {pageError}
        </p>
      )}

      {form && (
        <div className="mb-6 flex flex-col gap-4 rounded-card border border-line bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold">
            {t(
              form.editingBranch
                ? "branches.form.editTitle"
                : "branches.form.addTitle",
            )}
          </h2>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{t("branches.form.name")}</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value.slice(0, SHORT_TEXT_MAX_LENGTH),
                })
              }
              placeholder={t("branches.form.namePlaceholder")}
              className={inputClass(Boolean(formErrors.name))}
            />
            {formErrors.name && (
              <span className="text-xs text-error">{formErrors.name}</span>
            )}
          </label>

          <div className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{t("branches.form.city")}</span>
            <div className="flex gap-2">
              {(["spb", "moscow"] as CityCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    if (code !== form.city) {
                      geocodedKeyRef.current = null;
                      setAddressCoords(null);
                      setLookupStatus("idle");
                      setForm({ ...form, city: code, metroStation: "" });
                    }
                  }}
                  className={chip(form.city === code)}
                >
                  {t(`city.codes.${code}`)}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{t("branches.form.address")}</span>
            <input
              type="text"
              value={form.address}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: e.target.value.slice(0, ADDRESS_MAX_LENGTH),
                })
              }
              placeholder={t("branches.form.addressPlaceholder")}
              className={inputClass(Boolean(formErrors.address))}
            />
            {lookupStatus !== "idle" && (
              <span
                className={`text-xs ${
                  lookupStatus === "found"
                    ? "text-success"
                    : lookupStatus === "searching"
                      ? "text-ink-secondary"
                      : "text-warning"
                }`}
              >
                {lookupHint[lookupStatus]}
              </span>
            )}
            {formErrors.address && (
              <span className="text-xs text-error">{formErrors.address}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{t("branches.form.metro")}</span>
            <input
              type="text"
              list="branch-metro-stations"
              value={form.metroStation}
              onChange={(e) =>
                setForm({ ...form, metroStation: e.target.value })
              }
              placeholder={t("metro.searchPlaceholder")}
              className={inputClass(Boolean(formErrors.metro))}
            />
            <datalist id="branch-metro-stations">
              {stations.map((station) => (
                <option key={station.id} value={station.name}>
                  {station.line}
                </option>
              ))}
            </datalist>
            {formErrors.metro && (
              <span className="text-xs text-error">{formErrors.metro}</span>
            )}
          </label>

          <div className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{t("branches.form.equipment")}</span>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_TYPES.map((equipment) => (
                <button
                  key={equipment}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      equipment: form.equipment.includes(equipment)
                        ? form.equipment.filter((e) => e !== equipment)
                        : [...form.equipment, equipment],
                    })
                  }
                  className={chip(form.equipment.includes(equipment))}
                >
                  {equipment}
                </button>
              ))}
            </div>
          </div>

          {formErrors.submit && (
            <p role="alert" className="text-sm text-error">
              {formErrors.submit}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-card border border-line px-4 py-2.5 text-sm font-medium"
            >
              {t("branches.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="flex-1 rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t(
                form.editingBranch
                  ? "branches.form.update"
                  : "branches.form.save",
              )}
            </button>
          </div>
        </div>
      )}

      {branchesQuery.isPending || businessQuery.isPending ? (
        <div className="h-48 animate-pulse rounded-card bg-bg-secondary" />
      ) : branches.length === 0 && !form ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-ink-secondary">
            {t("branches.empty")}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {t("branches.addFirst")}
          </p>
        </div>
      ) : (
        <>
          {branches.length > 0 && (
            <p className="mb-2 text-sm font-medium text-ink-secondary">
              {t("branches.sectionTitle", { count: branches.length })}
            </p>
          )}
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="mb-3 rounded-card border border-line bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{branch.name}</p>
                  <p className="text-sm text-ink-secondary">{branch.address}</p>
                  {branch.metroStation && (
                    <p className="text-sm">
                      <span aria-hidden="true" className="mr-1 text-primary">
                        Ⓜ
                      </span>
                      {branch.metroStation}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(branch)}
                    className="text-sm font-medium text-primary"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(branch)}
                    className="text-sm font-medium text-error"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>

              {(branch.equipment?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {branch.equipment.map((equipment) => (
                    <span
                      key={equipment}
                      className="rounded-chip bg-bg-secondary px-2 py-1 text-xs text-ink-secondary"
                    >
                      {equipment}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3">
                {branch.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {branch.photos.map((url) => (
                      <div key={url} className="relative aspect-square">
                        <img
                          src={transformedImageUrl(url, 240)}
                          alt=""
                          className="h-full w-full rounded-input object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => void handleRemovePhoto(branch, url)}
                          aria-label={t("common.delete")}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={
                      uploadingBranchIds.has(branch.id) ||
                      branch.photos.length >= PHOTO_LIMIT
                    }
                    onClick={() => void handleAddPhotos(branch)}
                    className="text-sm font-medium text-primary disabled:opacity-50"
                  >
                    {uploadingBranchIds.has(branch.id)
                      ? t("baristaProfileScreen.uploading")
                      : t("branchPhotos.add")}
                  </button>
                  <span className="text-xs text-ink-secondary">
                    {t("branchPhotos.counter", {
                      count: branch.photos.length,
                      max: PHOTO_LIMIT,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
