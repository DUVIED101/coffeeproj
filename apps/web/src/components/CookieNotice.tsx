"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const ACK_KEY = "bb_cookie_notice_ack";

function readAck(): boolean {
  try {
    return window.localStorage.getItem(ACK_KEY) === "1";
  } catch {
    return true;
  }
}

function writeAck(): void {
  try {
    window.localStorage.setItem(ACK_KEY, "1");
  } catch {
    // Storage blocked: the notice simply shows again next visit.
  }
}

// Strictly-necessary cookies only (privacy policy §10.2), so this is a
// notice with an acknowledgement, not an opt-in gate.
export function CookieNotice(): React.JSX.Element | null {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readAck());
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t("cookies.notice")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          {t("cookies.notice")}{" "}
          <Link href="/privacy" className="text-primary underline">
            {t("cookies.more")}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            writeAck();
            setVisible(false);
          }}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 font-semibold text-white"
        >
          {t("cookies.accept")}
        </button>
      </div>
    </div>
  );
}
