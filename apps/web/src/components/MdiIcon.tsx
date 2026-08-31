import React from "react";

// Inline SVG renderer for @mdi/js path data — the same
// MaterialCommunityIcons glyphs the RN app renders via
// react-native-vector-icons.
export function MdiIcon({
  path,
  size = 24,
  className,
}: {
  path: string;
  size?: number;
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
