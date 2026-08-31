"use client";

import React, { useEffect, useState } from "react";
import {
  subscribeToAlerts,
  dismissAlert,
  type PendingAlert,
} from "@/platform/alert";

const buttonClasses = (
  style?: "default" | "cancel" | "destructive",
): string => {
  if (style === "destructive") return "bg-error text-white";
  if (style === "cancel") return "bg-bg-secondary text-ink";
  return "bg-primary text-white";
};

// Renders core-initiated alerts (getPlatform().alert.show) as a modal.
// Mirrors the information hierarchy of the iOS Alert the RN app shows.
export function AlertHost(): React.JSX.Element | null {
  const [alerts, setAlerts] = useState<PendingAlert[]>([]);

  useEffect(() => subscribeToAlerts(setAlerts), []);

  const current = alerts[0];
  if (!current) return null;

  const buttons =
    current.buttons.length > 0 ? current.buttons : [{ text: "OK" }];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bb-alert-title"
    >
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-xl">
        <h2 id="bb-alert-title" className="text-lg font-semibold">
          {current.title}
        </h2>
        {current.message && (
          <p className="mt-2 whitespace-pre-line text-sm text-ink-secondary">
            {current.message}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          {buttons.map((b, i) => (
            <button
              key={i}
              type="button"
              className={`rounded-input px-4 py-2 text-sm font-medium ${buttonClasses(b.style)}`}
              onClick={() => dismissAlert(current.id, b)}
            >
              {b.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
