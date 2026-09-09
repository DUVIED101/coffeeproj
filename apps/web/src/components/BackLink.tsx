"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { mdiArrowLeft } from "@mdi/js";
import { MdiIcon } from "@/components/MdiIcon";

type Props = {
  fallbackHref: string;
  label: string;
};

// Detail pages are reached from a list, and the browser's own back keeps the
// list's scroll position; a fresh tab (deep link, notification) has no
// in-app history, so it goes to the list route instead. Icon-only below lg
// (the header row is full at md), icon + label from lg; sized for that row.
export function BackLink({ fallbackHref, label }: Props): React.JSX.Element {
  const router = useRouter();
  const goBack = (): void => {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-line bg-white px-2 text-sm font-medium text-ink-secondary hover:text-ink lg:px-3"
    >
      <MdiIcon path={mdiArrowLeft} size={20} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
