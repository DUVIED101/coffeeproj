"use client";

import React from "react";

type Props = {
  label: string;
  ariaLabel: string;
  expandLabel: string;
  onClick: () => void;
  style?: React.CSSProperties;
};

export const TutorialChip = React.forwardRef<HTMLButtonElement, Props>(
  function TutorialChip(
    { label, ariaLabel, expandLabel, onClick, style },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        title={expandLabel}
        style={style}
        data-tour-chip=""
        className="pointer-events-auto absolute right-4 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-ink px-3.5 text-sm font-semibold text-white shadow-xl"
      >
        {label}
      </button>
    );
  },
);
