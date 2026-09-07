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
// in-app history, so it goes to the list route instead.
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
      className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
    >
      <MdiIcon path={mdiArrowLeft} size={18} />
      {label}
    </button>
  );
}
