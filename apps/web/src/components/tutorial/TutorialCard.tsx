"use client";

import React from "react";

type Props = {
  title: string;
  body?: string;
  stepLabel?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export const TutorialCard = React.forwardRef<HTMLDivElement, Props>(
  function TutorialCard(
    {
      title,
      body,
      stepLabel,
      primaryLabel,
      onPrimary,
      secondaryLabel,
      onSecondary,
      tertiaryLabel,
      onTertiary,
      className = "",
      style,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-label={title}
        style={style}
        className={`pointer-events-auto rounded-card border border-line bg-white p-4 text-ink shadow-xl ${className}`}
      >
        {stepLabel && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            {stepLabel}
          </p>
        )}
        <h2 className="text-base font-bold">{title}</h2>
        {body && (
          <p className="mt-1 max-h-[45vh] overflow-y-auto text-sm leading-relaxed">
            {body}
          </p>
        )}
        {(primaryLabel || secondaryLabel) && (
          <div className="mt-3 flex items-center justify-end gap-3">
            {secondaryLabel && onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                className="min-h-[40px] px-2 text-sm font-semibold text-primary"
              >
                {secondaryLabel}
              </button>
            )}
            {primaryLabel && onPrimary && (
              <button
                type="button"
                onClick={onPrimary}
                className="min-h-[40px] rounded-input bg-primary px-4 text-sm font-semibold text-white"
              >
                {primaryLabel}
              </button>
            )}
          </div>
        )}
        {tertiaryLabel && onTertiary && (
          <button
            type="button"
            onClick={onTertiary}
            className="mt-1 text-xs text-ink-secondary hover:text-ink"
          >
            {tertiaryLabel}
          </button>
        )}
      </div>
    );
  },
);
