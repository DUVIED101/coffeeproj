"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatform } from "@bystrobarista/core/platform";
import { BusinessService } from "@bystrobarista/core/services/BusinessService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type {
  BusinessType,
  LegalForm,
  SocialLink,
  SocialPlatform,
} from "@bystrobarista/core/types/business";
import type { UserId } from "@bystrobarista/core/types/ids";
import {
  pickPhotos,
  reportRejections,
} from "@bystrobarista/core/utils/pickPhotos";
import {
  DESCRIPTION_MAX_LENGTH,
  URL_MAX_LENGTH,
} from "@bystrobarista/core/utils/validation";
import { clampToEffectiveLength } from "@bystrobarista/core/utils/textLength";
import { transformedImageUrl } from "@/lib/imageTransform";

const NAME_MAX = 60;

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "telegram",
  "vk",
  "website",
  "other",
];

// Same placeholders as mobile's SocialLinksEditor (hardcoded there too).
const SOCIAL_PLACEHOLDERS: Record<SocialPlatform, string> = {
  instagram: "@handle",
  telegram: "@channel",
  vk: "vk.com/...",
  website: "https://...",
  other: "URL или контакт",
};

const fieldLabel = "text-sm font-medium text-ink";
const inputClass = (invalid?: boolean): string =>
  `rounded-input border ${invalid ? "border-error" : "border-line"} px-3 py-2 text-sm outline-none focus:border-primary`;

function RadioCard({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 rounded-input border px-3 py-2 text-left ${
        selected ? "border-primary bg-primary/5" : "border-line"
      }`}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-xs text-ink-secondary">{description}</span>
    </button>
  );
}

// Web port of mobile's BusinessProfileSetupScreen basics+brand steps. The
// first branch (mobile steps 3-4) lives on /branches — after creating the
// business the user is sent there to add it.
export function BusinessProfileForm(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [legalForm, setLegalForm] = useState<LegalForm>("organization");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessType, setBusinessType] =
    useState<BusinessType>("singleLocation");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [pendingLogoUri, setPendingLogoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!business || prefilled) return;
    setPrefilled(true);
    setLegalForm(business.legalForm ?? "organization");
    setName(business.name);
    setDescription(business.description ?? "");
    setBusinessType(business.businessType);
    setWebsite(business.website ?? "");
    setSocialLinks(business.socialLinks);
  }, [business, prefilled]);

  const handlePickLogo = async (): Promise<void> => {
    const picked = await pickPhotos({ quality: 0.8, selectionLimit: 1 });
    if (!picked || !reportRejections(t, picked)) return;
    setPendingLogoUri(picked.accepted[0].uri);
  };

  const handleSave = async (): Promise<void> => {
    if (!user?.id) return;
    if (name.trim().length < 2) {
      setError(t("businessSetup.basics.nameRequired"));
      return;
    }
    setIsSaving(true);
    setError(null);
    const cleanedLinks = socialLinks
      .map((link) => ({ ...link, value: link.value.trim() }))
      .filter((link) => link.value !== "");
    const softFailures: string[] = [];
    try {
      let saved = business;
      if (business) {
        saved = await BusinessService.updateBusiness(business.id, {
          name: name.trim(),
          // null (not undefined) clears the column on update.
          description: description.trim() === "" ? null : description.trim(),
          businessType,
          legalForm,
          website: website.trim() === "" ? null : website.trim(),
          socialLinks: cleanedLinks,
        } as Parameters<typeof BusinessService.updateBusiness>[1]);
      } else {
        saved = await BusinessService.createBusiness({
          ownerId: user.id as UserId,
          name: name.trim(),
          description: description.trim() || undefined,
          businessType,
          legalForm,
          website: website.trim() || undefined,
          socialLinks: cleanedLinks,
        });
      }
      if (pendingLogoUri && saved) {
        try {
          await BusinessService.uploadBusinessLogo(
            saved.id,
            user.id,
            pendingLogoUri,
          );
        } catch (e) {
          console.error("Logo upload failed:", e);
          softFailures.push("logo");
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["business"] });
      if (softFailures.length > 0) {
        getPlatform().alert.show(
          t("common.warning"),
          t("businessSetup.errors.partialSuccess", {
            items: softFailures.join(", "),
          }),
          [{ text: t("common.ok") }],
        );
      }
      const hasBranches = (branchesQuery.data?.length ?? 0) > 0;
      router.push(hasBranches ? "/profile" : "/branches?new=1");
    } catch (e) {
      console.error("Error saving business profile:", e);
      setError(t("businessSetup.errors.saveFailed"));
      setIsSaving(false);
    }
  };

  if (businessQuery.isPending) {
    return <div className="h-96 animate-pulse rounded-card bg-bg-secondary" />;
  }

  const logoPreview = pendingLogoUri
    ? pendingLogoUri
    : business?.logoUrl
      ? transformedImageUrl(business.logoUrl, 160)
      : null;

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="text-2xl font-bold">{t("businessSetup.title")}</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        {t("businessSetup.subtitle")}
      </p>

      <div className="mt-4 flex flex-col gap-5 rounded-card border border-line bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold">
          {t("businessSetup.basics.title")}
        </h2>

        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("auth.employerSubtype.title")}</span>
          <div className="flex gap-2">
            <RadioCard
              selected={legalForm === "organization"}
              title={t("auth.employerSubtype.organizationTitle")}
              description={t("auth.employerSubtype.organizationDescription")}
              onSelect={() => setLegalForm("organization")}
            />
            <RadioCard
              selected={legalForm === "individual_entrepreneur"}
              title={t("auth.employerSubtype.ipTitle")}
              description={t("auth.employerSubtype.ipDescription")}
              onSelect={() => setLegalForm("individual_entrepreneur")}
            />
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>
            {t(
              legalForm === "organization"
                ? "auth.employerDetails.nameOrgLabel"
                : "auth.employerDetails.nameIpLabel",
            )}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            placeholder={t(
              legalForm === "organization"
                ? "auth.employerDetails.nameOrgPlaceholder"
                : "auth.employerDetails.nameIpPlaceholder",
            )}
            className={inputClass(Boolean(error))}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>
            {t("businessSetup.basics.description")}
          </span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) =>
              setDescription(
                clampToEffectiveLength(e.target.value, DESCRIPTION_MAX_LENGTH),
              )
            }
            placeholder={t("businessSetup.basics.descriptionPlaceholder")}
            className={inputClass()}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("businessSetup.basics.type")}</span>
          <div className="flex gap-2">
            <RadioCard
              selected={businessType === "singleLocation"}
              title={t("businessSetup.basics.typeSingle")}
              description={t("businessSetup.basics.typeSingleDesc")}
              onSelect={() => setBusinessType("singleLocation")}
            />
            <RadioCard
              selected={businessType === "multiLocation"}
              title={t("businessSetup.basics.typeMulti")}
              description={t("businessSetup.basics.typeMultiDesc")}
              onSelect={() => setBusinessType("multiLocation")}
            />
          </div>
        </div>

        <h2 className="border-t border-line pt-4 text-lg font-semibold">
          {t("businessSetup.brand.title")}
        </h2>
        <p className="-mt-4 text-sm text-ink-secondary">
          {t("businessSetup.brand.subtitle")}
        </p>

        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt=""
              className="h-20 w-20 rounded-full border border-line object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-bg-secondary text-center text-xs text-ink-secondary">
              {t("businessSetup.brand.noLogo")}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handlePickLogo()}
            className="rounded-input border border-line px-3 py-1.5 text-sm font-medium"
          >
            {t(
              logoPreview
                ? "businessSetup.brand.changeLogo"
                : "businessSetup.brand.pickLogo",
            )}
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>{t("businessSetup.brand.website")}</span>
          <input
            type="url"
            value={website}
            onChange={(e) =>
              setWebsite(e.target.value.slice(0, URL_MAX_LENGTH))
            }
            placeholder="https://example.com"
            className={inputClass()}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>
            {t("businessSetup.brand.socialLinks")}
          </span>
          {socialLinks.map((link, index) => (
            <div key={index} className="flex gap-2">
              <select
                value={link.platform}
                onChange={(e) =>
                  setSocialLinks(
                    socialLinks.map((l, i) =>
                      i === index
                        ? { ...l, platform: e.target.value as SocialPlatform }
                        : l,
                    ),
                  )
                }
                className="w-36 rounded-input border border-line bg-white px-2 py-2 text-sm outline-none focus:border-primary"
              >
                {SOCIAL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {t(`socialLinks.${platform}`)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={link.value}
                onChange={(e) =>
                  setSocialLinks(
                    socialLinks.map((l, i) =>
                      i === index
                        ? {
                            ...l,
                            value: e.target.value.slice(0, URL_MAX_LENGTH),
                          }
                        : l,
                    ),
                  )
                }
                placeholder={SOCIAL_PLACEHOLDERS[link.platform]}
                className={`flex-1 ${inputClass()}`}
              />
              <button
                type="button"
                onClick={() =>
                  setSocialLinks(socialLinks.filter((_, i) => i !== index))
                }
                className="text-sm font-medium text-error"
              >
                {t("common.delete")}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setSocialLinks([
                ...socialLinks,
                { platform: "instagram", value: "" },
              ])
            }
            className="self-start text-sm font-medium text-primary"
          >
            + {t("businessSetup.brand.socialLinks")}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          data-tour="business.wizardFooter"
          className="rounded-card bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving
            ? t("baristaProfileScreen.saving")
            : t("businessSetup.finish")}
        </button>
      </div>
    </div>
  );
}
