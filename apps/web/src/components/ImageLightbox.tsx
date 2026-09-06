"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { transformedImageUrl } from "@/lib/imageTransform";

type Props = {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
};

// Web twin of mobile's FullscreenImageViewer: full-screen overlay, arrow keys
// and Escape, click outside to close. Images go through the resize endpoint
// at 1200px so a 4 MB upload never lands in the viewer at full weight.
export function ImageLightbox({
  photos,
  initialIndex = 0,
  onClose,
}: Props): React.JSX.Element | null {
  const { t } = useTranslation();
  const [index, setIndex] = useState(initialIndex);
  const count = photos.length;

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + count) % count),
    [count],
  );
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, prev, next]);

  if (count === 0) return null;

  const navButton =
    "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/30"
      >
        ✕
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="‹"
            className={`${navButton} left-3`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="›"
            className={`${navButton} right-3`}
          >
            ›
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white">
            {index + 1} / {count}
          </span>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={transformedImageUrl(photos[index], 1200)}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-input object-contain"
      />
    </div>
  );
}
