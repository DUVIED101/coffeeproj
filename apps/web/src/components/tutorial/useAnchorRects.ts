"use client";

import { useEffect, useState } from "react";
import type { Rect } from "@bystrobarista/core/tutorial/placement";
import type { TutorialAnchorKey } from "@bystrobarista/core/types/tutorial";

export type AnchorRects = Partial<Record<TutorialAnchorKey, Rect>>;

const REMEASURE_MS = 500;

const toRect = (box: DOMRect): Rect => ({
  x: box.left,
  y: box.top,
  width: box.width,
  height: box.height,
});

const inViewport = (box: DOMRect): boolean =>
  box.left < window.innerWidth &&
  box.right > 0 &&
  box.top < window.innerHeight &&
  box.bottom > 0;

// Desktop and mobile navs render the same data-tour keys; take the first
// element that is laid out (display:none elements have no rects) and on
// screen. An element that exists only below the fold is scrolled into view
// once per key, so a form's save button can host a hint.
const findVisibleRect = (
  key: TutorialAnchorKey,
  scrolledKeys: Set<TutorialAnchorKey>,
): Rect | null => {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`);
  let offscreen: HTMLElement | null = null;
  for (const node of nodes) {
    if (node.getClientRects().length === 0) continue;
    const box = node.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    if (inViewport(box)) return toRect(box);
    offscreen = offscreen ?? node;
  }
  if (offscreen && !scrolledKeys.has(key)) {
    scrolledKeys.add(key);
    offscreen.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  return null;
};

const sameRects = (a: AnchorRects, b: AnchorRects): boolean => {
  const keys = Object.keys(a) as TutorialAnchorKey[];
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    const ra = a[key];
    const rb = b[key];
    return (
      !!ra &&
      !!rb &&
      ra.x === rb.x &&
      ra.y === rb.y &&
      ra.width === rb.width &&
      ra.height === rb.height
    );
  });
};

export function useAnchorRects(
  keys: readonly TutorialAnchorKey[],
  enabled: boolean,
): AnchorRects {
  const [rects, setRects] = useState<AnchorRects>({});
  const signature = keys.join("|");

  useEffect(() => {
    if (!enabled || signature === "") {
      setRects({});
      return undefined;
    }
    const wanted = signature.split("|") as TutorialAnchorKey[];
    const scrolledKeys = new Set<TutorialAnchorKey>();
    let frame = 0;
    const measure = (): void => {
      const next: AnchorRects = {};
      for (const key of wanted) {
        const rect = findVisibleRect(key, scrolledKeys);
        if (rect) next[key] = rect;
      }
      setRects((previous) => (sameRects(previous, next) ? previous : next));
    };
    const schedule = (): void => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-tour", "hidden"],
    });
    const resizes = new ResizeObserver(schedule);
    resizes.observe(document.documentElement);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const interval = window.setInterval(measure, REMEASURE_MS);

    return () => {
      mutations.disconnect();
      resizes.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.clearInterval(interval);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, signature]);

  return rects;
}
