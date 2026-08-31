"use client";

import React from "react";

type Props = {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  hint?: string;
};

export function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  hint,
}: Props): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className={`rounded-input border px-3 py-2 text-sm outline-none focus:border-primary ${
          error ? "border-error" : "border-line"
        }`}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
