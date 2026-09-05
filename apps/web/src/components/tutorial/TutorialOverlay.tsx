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
import { stepPosition } from "@bystrobarista/core/tutorial/engine";
import {
  padRect,
  placeCard,
  type Rect,
  type Size,
} from "@bystrobarista/core/tutorial/placement";
import type { TutorialAnchorKey } from "@bystrobarista/core/types/tutorial";
import { pathnameToRoute, routeToHref } from "@/lib/tutorialBindings";
import { TutorialCard } from "./TutorialCard";
import { useAnchorRects } from "./useAnchorRects";

const CARD_MAX_WIDTH = 360;
const CARD_MARGIN = 16;
const CARD_GAP = 12;
const CARD_FALLBACK_HEIGHT = 160;
const HOLE_PADDING = 6;
// MobileTabBar (<md) height incl. its border; the card must not sit under it.
const MOBILE_TAB_BAR_HEIGHT = 56;
// Sticky AppHeader height; hint cards dock right under it.
const HEADER_HEIGHT = 58;
const MD_BREAKPOINT = 768;

const backdropClass = "pointer-events-auto absolute bg-black/55";

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
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [cardSize, setCardSize] = useState<Size | null>(null);
  const cardObserver = useRef<ResizeObserver | null>(null);
  // Callback ref: the card node is re-created whenever the step or its
  // presentation (docked / placed) changes, so the observer must follow it.
  const cardRef = useCallback((node: HTMLDivElement | null) => {
    cardObserver.current?.disconnect();
    cardObserver.current = null;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const box = node.getBoundingClientRect();
      if (box.height === 0) return;
      setCardSize((previous) =>
        previous &&
        previous.width === box.width &&
        previous.height === box.height
          ? previous
          : { width: box.width, height: box.height },
      );
    });
    observer.observe(node);
    cardObserver.current = observer;
  }, []);

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
  const rects = useAnchorRects(keys, active);

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
  const showMe = showMeHref ? () => router.push(showMeHref) : undefined;
  const hole: Rect | undefined = currentStep.anchor
    ? rects[currentStep.anchor]
    : undefined;

  if (!hole) {
    return (
      <div className="pointer-events-none fixed inset-x-4 bottom-16 z-[45] flex justify-center md:bottom-4">
        <TutorialCard
          ref={cardRef}
          title={title}
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
  const placement = placeCard(
    padded,
    { width: cardWidth, height: cardSize?.height ?? CARD_FALLBACK_HEIGHT },
    viewport,
    {
      gap: CARD_GAP,
      margin: CARD_MARGIN,
      insets: {
        top: 0,
        bottom: viewport.width < MD_BREAKPOINT ? MOBILE_TAB_BAR_HEIGHT : 0,
      },
    },
  );
  // A hint must leave the form usable: below the anchor when it fits, else
  // docked under the sticky header.
  const cardTop =
    currentStep.mode === "hint" && placement.side !== "below"
      ? HEADER_HEIGHT + CARD_MARGIN
      : placement.top;
  const card = (
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
      style={{ top: cardTop, left: placement.left, width: cardWidth }}
    />
  );

  if (currentStep.mode === "hint") {
    return (
      <div className="pointer-events-none fixed inset-0 z-[45]">{card}</div>
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
      {card}
    </div>
  );
}
