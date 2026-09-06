"use client";

import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { useWhatsNewStore } from "@bystrobarista/core/stores/whatsNewStore";

// One-time dialog after a release; the store decides whether it is due and
// keeps the tutorial on hold while it is open.
export function WhatsNewDialog(): React.JSX.Element | null {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const consentAcceptedAt = useAuthStore((s) => s.user?.consentAcceptedAt);
  const status = useWhatsNewStore((s) => s.status);
  const release = useWhatsNewStore((s) => s.release);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    const whatsNew = useWhatsNewStore.getState();
    if (!user) {
      whatsNew.clear();
      return;
    }
    if (!user.consentAcceptedAt) return;
    void whatsNew.bootstrap(user);
  }, [userId, consentAcceptedAt]);

  useEffect(() => {
    if (status === "visible") okRef.current?.focus();
  }, [status]);

  if (status !== "visible" || !release) return null;

  const dismiss = (): void => {
    void useWhatsNewStore.getState().dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") dismiss();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        data-testid="whats-new"
        className="w-full max-w-md rounded-card border border-line bg-white p-6 text-ink shadow-xl"
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {t("whatsNew.eyebrow")}
        </p>
        <h2 id="whats-new-title" className="text-xl font-bold">
          {t(release.titleKey)}
        </h2>
        <ul className="mt-5 space-y-4">
          {release.items.map((item) => (
            <li key={item.titleKey} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
              />
              <div>
                <p className="font-semibold">{t(item.titleKey)}</p>
                <p className="text-sm leading-relaxed text-ink-secondary">
                  {t(item.bodyKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <button
          ref={okRef}
          type="button"
          onClick={dismiss}
          className="mt-6 min-h-[44px] w-full rounded-input bg-primary text-sm font-semibold text-white"
        >
          {t("whatsNew.ok")}
        </button>
      </div>
    </div>
  );
}
