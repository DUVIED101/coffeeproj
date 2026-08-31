"use client";

import React from "react";

type Props = {
  rating: number;
  count?: number;
  showValue?: boolean;
};

// Compact star aggregate, mirroring mobile's StarRow: one star glyph +
// numeric value + review count. Full 5-star rows arrive with reviews UI.
export function StarRow({
  rating,
  count,
  showValue,
}: Props): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-secondary">
      <span aria-hidden="true" className="text-warning">
        ★
      </span>
      {showValue && (
        <span className="font-medium text-ink">{rating.toFixed(1)}</span>
      )}
      {typeof count === "number" && <span>({count})</span>}
    </span>
  );
}
