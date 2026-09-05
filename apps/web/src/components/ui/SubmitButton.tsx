"use client";

import React from "react";

type Props = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  type?: "submit" | "button";
  tourKey?: string;
};

export function SubmitButton({
  label,
  loading,
  disabled,
  variant = "primary",
  onClick,
  type = "submit",
  tourKey,
}: Props): React.JSX.Element {
  const base =
    "rounded-card px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-primary text-white"
      : "border border-line bg-white text-ink";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      data-tour={tourKey}
      className={`${base} ${styles}`}
    >
      {loading ? "…" : label}
    </button>
  );
}
