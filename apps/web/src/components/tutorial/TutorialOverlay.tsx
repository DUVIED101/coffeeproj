"use client";

import { usePathname, useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import {
  selectCurrentStep,
  useTutorialStore,
} from "@bystrobarista/core/stores/tutorialStore";
import {
  resolvePresentation,
  stepPosition,
} from "@bystrobarista/core/tutorial/engine";
import {
  padRect,
  placeCard,
  type Rect,
  type Size,
} from "@bystrobarista/core/tutorial/placement";
import type {
  TutorialAnchorKey,
  TutorialStepKey,
} from "@bystrobarista/core/types/tutorial";
import { pathnameToRoute, routeToHref } from "@/lib/tutorialBindings";
import { TutorialCard } from "./TutorialCard";
import { TutorialChip } from "./TutorialChip";
import { scrollAnchorIntoView, useAnchorRects } from "./useAnchorRects";

const CARD_MAX_WIDTH = 360;
const CARD_MARGIN = 16;
const CARD_GAP = 12;
const CARD_FALLBACK_HEIGHT = 160;
const CHIP_FALLBACK_SIZE: Size = { width: 60, height: 40 };
const HOLE_PADDING = 6;
// MobileTabBar (<md) height incl. its border; the card must not sit under it.
const MOBILE_TAB_BAR_HEIGHT = 56;
// Sticky AppHeader height; cards must not slide under it.
const HEADER_HEIGHT = 58;
const MD_BREAKPOINT = 768;

const backdropClass = "pointer-events-auto absolute bg-black/55";

type SizeRef = (node: HTMLElement | null) => void;

// Callback ref: the measured node is re-created whenever the step or its
// presentation changes, so the observer must follow it.
function useSizeRef(): [Size | null, SizeRef] {
  const [size, setSize] = useState<Size | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const next = new ResizeObserver(() => {
      const box = node.getBoundingClientRect();
      if (box.height === 0) return;
      setSize((previous) =>
        previous &&
        previous.width === box.width &&
        previous.height === box.height
          ? previous
          : { width: box.width, height: box.height },
      );
    });
    next.observe(node);
    observer.current = next;
  }, []);
  return [size, ref];
}

export function TutorialOverlay(): React.JSX.Element | null {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const consentAcceptedAt = useAuthStore((s) => s.user?.consentAcceptedAt);
  const userAccountType = useAuthStore((s) => s.user?.accountType);
  const status = useTutorialStore((s) => s.status);
  const showReplayHint = useTutorialStore((s) => s.showReplayHint);
  const holdsCount = useTutorialStore((s) => s.holds.length);
  const currentStep = useTutorialStore(selectCurrentStep);
  const steps = useTutorialStore((s) => s.steps);
  const route = useTutorialStore((s) => s.route);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [collapsedKey, setCollapsedKey] = useState<TutorialStepKey | null>(
    null,
  );
  const [cardSize, cardRef] = useSizeRef();
  const [chipSize, chipRef] = useSizeRef();

  useEffect(() => {
    const user = useAuthStore.getState().user;
    const tutorial = useTutorialStore.getState();
    if (!user) {
      tutorial.clear();
      return;
    }
    if (!user.consentAcceptedAt) return;
    void tutorial.bootstrap(user);
  }, [userId, consentAcceptedAt, userAccountType]);

  useEffect(() => {
    useTutorialStore.getState().setRoute(pathnameToRoute(pathname ?? ""));
  }, [pathname]);

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        void useTutorialStore.getState().refreshFacts();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const update = (): void =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const active =
    status === "active" && holdsCount === 0 && currentStep !== null;

  const keys = useMemo(() => {
    const wanted: TutorialAnchorKey[] = [];
    if (currentStep?.anchor) wanted.push(currentStep.anchor);
    if (currentStep?.doneWhen?.anchorVisible) {
      wanted.push(currentStep.doneWhen.anchorVisible);
    }
    return wanted;
  }, [currentStep]);
  const { rects, present } = useAnchorRects(keys, active);

  useEffect(() => {
    useTutorialStore
      .getState()
      .setVisibleAnchors(Object.keys(rects) as TutorialAnchorKey[]);
  }, [rects]);

  const cardWidth = Math.min(
    CARD_MAX_WIDTH,
    Math.max(0, viewport.width - 2 * CARD_MARGIN),
  );

  if (showReplayHint) {
    return (
      <div className="fixed inset-0 z-[45]">
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <TutorialCard
            ref={cardRef}
            title={t("tutorial.replayHint.title")}
            body={t("tutorial.replayHint.body")}
            primaryLabel={t("tutorial.replayHint.ok")}
            onPrimary={() => useTutorialStore.getState().dismissReplayHint()}
            style={{ width: cardWidth }}
          />
        </div>
      </div>
    );
  }

  if (!active || !currentStep || viewport.width === 0) return null;

  const store = useTutorialStore.getState();
  const key = currentStep.key;
  const position = stepPosition(steps, key);
  const stepLabel =
    position.n > 0
      ? t("tutorial.common.stepOf", { n: position.n, total: position.total })
      : undefined;
  const title = t(currentStep.titleKey);
  const body = t(currentStep.bodyKey);
  const skipAllLabel = t("tutorial.common.skipAll");

  if (currentStep.mode === "card") {
    return (
      <div className="fixed inset-0 z-[45]">
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <TutorialCard
            ref={cardRef}
            title={title}
            body={body}
            primaryLabel={t("tutorial.common.start")}
            onPrimary={() => store.completeStep(key)}
            tertiaryLabel={skipAllLabel}
            onTertiary={() => store.skipAll()}
            style={{ width: cardWidth }}
          />
        </div>
      </div>
    );
  }

  const anchorKey = currentStep.anchor;
  const hole: Rect | undefined = anchorKey ? rects[anchorKey] : undefined;
  const onScreen = !hole && !!anchorKey && present.includes(anchorKey);
  const presentation = resolvePresentation(
    currentStep,
    route,
    hole ? "visible" : onScreen ? "offscreen" : "absent",
  );
  if (presentation === "hidden") return null;

  const isInfo = currentStep.kind === "info";
  const dismissLabel = isInfo
    ? t("tutorial.common.gotIt")
    : t("tutorial.common.skipStep");
  const dismiss = (): void => {
    if (isInfo) store.completeStep(key);
    else store.skipStep(key);
  };
  const showMeHref = currentStep.showMeRoute
    ? routeToHref(currentStep.showMeRoute)
    : null;
  const showMe =
    onScreen && anchorKey
      ? () => {
          scrollAnchorIntoView(anchorKey);
        }
      : showMeHref
        ? () => router.push(showMeHref)
        : undefined;

  if (!hole) {
    return (
      <div className="pointer-events-none fixed inset-x-4 bottom-16 z-[45] flex justify-center md:bottom-4">
        <TutorialCard
          ref={cardRef}
          title={title}
          body={onScreen ? body : undefined}
          stepLabel={stepLabel}
          primaryLabel={showMe ? t("tutorial.common.showMe") : dismissLabel}
          onPrimary={showMe ?? dismiss}
          secondaryLabel={showMe ? dismissLabel : undefined}
          onSecondary={showMe ? dismiss : undefined}
          tertiaryLabel={skipAllLabel}
          onTertiary={() => store.skipAll()}
          className="w-full max-w-[360px]"
        />
      </div>
    );
  }

  const padded = padRect(hole, HOLE_PADDING, viewport);
  const placementOptions = {
    gap: CARD_GAP,
    margin: CARD_MARGIN,
    insets: {
      top: HEADER_HEIGHT,
      bottom: viewport.width < MD_BREAKPOINT ? MOBILE_TAB_BAR_HEIGHT : 0,
    },
  };
  const cardPlacement = placeCard(
    padded,
    { width: cardWidth, height: cardSize?.height ?? CARD_FALLBACK_HEIGHT },
    viewport,
    placementOptions,
  );

  if (presentation === "hint") {
    if (collapsedKey === key) {
      const chipPlacement = placeCard(
        padded,
        chipSize ?? CHIP_FALLBACK_SIZE,
        viewport,
        placementOptions,
      );
      return (
        <div className="pointer-events-none fixed inset-0 z-[45]">
          <TutorialChip
            ref={chipRef}
            label={t("tutorial.common.chip", {
              n: position.n,
              total: position.total,
            })}
            ariaLabel={[stepLabel, title].filter(Boolean).join(". ")}
            expandLabel={t("tutorial.common.expand")}
            onClick={() => setCollapsedKey(null)}
            style={{ top: chipPlacement.top }}
          />
        </div>
      );
    }
    return (
      <div className="pointer-events-none fixed inset-0 z-[45]">
        <TutorialCard
          ref={cardRef}
          title={title}
          body={body}
          stepLabel={stepLabel}
          primaryLabel={t("tutorial.common.gotIt")}
          onPrimary={() => setCollapsedKey(key)}
          secondaryLabel={dismissLabel}
          onSecondary={dismiss}
          tertiaryLabel={skipAllLabel}
          onTertiary={() => store.skipAll()}
          className="absolute"
          style={{
            top: cardPlacement.top,
            left: cardPlacement.left,
            width: cardWidth,
          }}
        />
      </div>
    );
  }

  const holeBottom = padded.y + padded.height;
  const holeRight = padded.x + padded.width;
  return (
    <div className="pointer-events-none fixed inset-0 z-[45]">
      <div
        className={backdropClass}
        style={{ top: 0, left: 0, right: 0, height: padded.y }}
      />
      <div
        className={backdropClass}
        style={{ top: holeBottom, left: 0, right: 0, bottom: 0 }}
      />
      <div
        className={backdropClass}
        style={{
          top: padded.y,
          left: 0,
          width: padded.x,
          height: padded.height,
        }}
      />
      <div
        className={backdropClass}
        style={{
          top: padded.y,
          left: holeRight,
          right: 0,
          height: padded.height,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-card ring-2 ring-primary"
        style={{
          top: padded.y,
          left: padded.x,
          width: padded.width,
          height: padded.height,
        }}
      />
      <TutorialCard
        ref={cardRef}
        title={title}
        body={body}
        stepLabel={stepLabel}
        primaryLabel={isInfo ? dismissLabel : undefined}
        onPrimary={isInfo ? dismiss : undefined}
        secondaryLabel={isInfo ? undefined : dismissLabel}
        onSecondary={isInfo ? undefined : dismiss}
        tertiaryLabel={skipAllLabel}
        onTertiary={() => store.skipAll()}
        className="absolute"
        style={{
          top: cardPlacement.top,
          left: cardPlacement.left,
          width: cardWidth,
        }}
      />
    </div>
  );
}
