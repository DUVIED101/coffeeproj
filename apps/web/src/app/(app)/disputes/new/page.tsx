"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { getPlatform } from "@bystrobarista/core/platform";
import type { ApplicationId } from "@bystrobarista/core/types/ids";

const DESCRIPTION_MIN = 30;
const DESCRIPTION_MAX = 2000;

// Role-specific category subsets — validated server-side by
// submit_application_dispute (migration 080).
const BARISTA_CATEGORIES = [
  "unpaid",
  "misrepresentation",
  "harassment",
  "safety",
  "fraud",
  "other",
] as const;
const BUSINESS_CATEGORIES = [
  "no_show",
  "intoxication",
  "harassment",
  "safety",
  "fraud",
  "other",
] as const;

const SEVERITIES = ["warning", "serious", "critical"] as const;

const SEVERITY_SELECTED: Record<string, string> = {
  warning: "border-[#F59E0B] bg-[#F59E0B] text-white",
  serious: "border-[#FF8C00] bg-[#FF8C00] text-white",
  critical: "border-[#EF4444] bg-[#EF4444] text-white",
};

function DisputeForm(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");
  const accountType = useAuthStore((s) => s.user?.accountType);
  const categories =
    accountType === "business" ? BUSINESS_CATEGORIES : BARISTA_CATEGORIES;

  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!applicationId) {
    return (
      <p className="py-16 text-center text-ink-secondary">
        {t("disputes.notFound")}
      </p>
    );
  }

  const canSubmit =
    selected.length > 0 &&
    severity !== null &&
    description.trim().length >= DESCRIPTION_MIN &&
    !submitting;

  const toggleCategory = (code: string): void => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit || !severity) return;
    setSubmitting(true);
    setError(null);
    try {
      await ApplicationService.submitApplicationDispute({
        applicationId: applicationId as ApplicationId,
        categories: selected,
        severity,
        description: description.trim(),
      });
      getPlatform().alert.show(
        t("disputes.successTitle"),
        t("disputes.successBody"),
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("ALREADY_FILED") || message.includes("unique")) {
        setError(t("disputes.errors.alreadyFiled"));
      } else if (message.includes("APPLICATION_NOT_ACTIVE")) {
        setError(t("disputes.errors.notEligible"));
      } else {
        setError(t("common.tryAgain"));
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-2 text-2xl font-bold">{t("disputes.formTitle")}</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        {t("disputes.formIntro")}
      </p>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">
          {t("disputes.categoryLabel")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleCategory(code)}
              aria-pressed={selected.includes(code)}
              className={`rounded-chip border px-3 py-1.5 text-sm ${
                selected.includes(code)
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-white text-ink"
              }`}
            >
              {t(`disputes.category.${code}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">
          {t("disputes.severityLabel")}
        </h2>
        <div className="flex gap-2">
          {SEVERITIES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setSeverity(code)}
              aria-pressed={severity === code}
              className={`rounded-chip border px-3 py-1.5 text-sm ${
                severity === code
                  ? SEVERITY_SELECTED[code]
                  : "border-line bg-white text-ink"
              }`}
            >
              {t(`disputes.severity.${code}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">
          {t("disputes.descriptionLabel")}
        </h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("disputes.descriptionPlaceholder")}
          rows={6}
          maxLength={DESCRIPTION_MAX}
          className="w-full rounded-input border border-line p-3 text-sm"
        />
        <p className="mt-1 text-right text-xs text-ink-secondary">
          {description.length}/{DESCRIPTION_MAX}
        </p>
      </section>

      {error && (
        <p role="alert" className="mb-4 text-sm text-error">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSubmit}
        className="w-full rounded-card bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {t("disputes.submit")}
      </button>
    </div>
  );
}

export default function DisputeFormPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <DisputeForm />
    </Suspense>
  );
}
