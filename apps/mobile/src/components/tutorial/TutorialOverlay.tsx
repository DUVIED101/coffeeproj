import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  InteractionManager,
  Keyboard,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { COLORS, RADII } from '@bystrobarista/core/config/constants';
import { selectCurrentStep, useTutorialStore } from '@bystrobarista/core/stores/tutorialStore';
import {
  resolvePresentation,
  stepPosition,
  type TutorialAnchorState,
} from '@bystrobarista/core/tutorial/engine';
import {
  isRectUsable,
  padRect,
  placeCard,
  type Rect,
  type Size,
} from '@bystrobarista/core/tutorial/placement';
import type {
  TutorialAnchorKey,
  TutorialRole,
  TutorialRouteKey,
  TutorialStepKey,
} from '@bystrobarista/core/types/tutorial';
import { BusinessService } from '@bystrobarista/core/services/BusinessService';
import { navigationRef } from '../../navigation/navigationRef';
import { pickAnchorEntries, useTutorialAnchorStore } from '../../stores/tutorialAnchorStore';
import { TutorialCard } from './TutorialCard';
import { TutorialChip } from './TutorialChip';
import { describeRoute, navigateToRoute, toTutorialRoute } from './tutorialBindings';

const CARD_MAX_WIDTH = 360;
const CARD_MARGIN = 16;
const CARD_GAP = 12;
const CARD_FALLBACK_HEIGHT = 180;
const CHIP_FALLBACK_SIZE: Size = { width: 64, height: 44 };
const HOLE_PADDING = 6;
const TAB_BAR_HEIGHT = 49;
const SPOTLIGHT_REMEASURE_MS = 250;
const HINT_REMEASURE_MS = 500;
const FADE_MS = 180;

const sameRect = (a: Rect | null, b: Rect | null): boolean =>
  a === b ||
  (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

const sameSize = (a: Size | null, b: Size): boolean =>
  !!a && a.width === b.width && a.height === b.height;

type AnchorInfo = { state: TutorialAnchorState; reveal?: () => void };
const ABSENT_ANCHOR: AnchorInfo = { state: 'absent' };

const swallowTouches = { onStartShouldSetResponder: () => true, accessible: false } as const;

const openRoute = async (
  route: TutorialRouteKey,
  role: TutorialRole,
  userId: string | null
): Promise<void> => {
  if (route !== 'branches' || !userId) {
    navigateToRoute(route, role);
    return;
  }
  const business = await BusinessService.getBusinessByOwnerId(userId).catch(() => null);
  navigateToRoute(route, role, business ? { businessId: business.id } : {});
};

export const TutorialOverlay: React.FC = () => {
  const { t } = useTranslation();
  const status = useTutorialStore(s => s.status);
  const showReplayHint = useTutorialStore(s => s.showReplayHint);
  const holdsCount = useTutorialStore(s => s.holds.length);
  const currentStep = useTutorialStore(selectCurrentStep);
  const steps = useTutorialStore(s => s.steps);
  const accountType = useTutorialStore(s => s.accountType);
  const userId = useTutorialStore(s => s.userId);
  const route = useTutorialStore(s => s.route);
  const entries = useTutorialAnchorStore(s => s.entries);
  const layoutVersion = useTutorialAnchorStore(s => s.layoutVersion);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [hole, setHole] = useState<Rect | null>(null);
  const [anchorInfo, setAnchorInfo] = useState<AnchorInfo>(ABSENT_ANCHOR);
  const [cardSize, setCardSize] = useState<Size | null>(null);
  const [chipSize, setChipSize] = useState<Size | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const [collapsedKey, setCollapsedKey] = useState<TutorialStepKey | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const active = status === 'active' && holdsCount === 0 && currentStep !== null;

  useEffect(() => {
    const syncRoute = (): void => {
      if (!navigationRef.isReady()) return;
      const description = describeRoute(navigationRef.getRootState());
      useTutorialStore.getState().setRoute(toTutorialRoute(description.path));
    };
    const unsubscribe = navigationRef.addListener('state', syncRoute);
    syncRoute();
    return unsubscribe;
  }, [entries]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void useTutorialStore.getState().refreshFacts();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Typing into the form means the hint was read: keep it collapsed afterwards.
  useEffect(() => {
    if (keyboardVisible && currentStep?.mode === 'hint') setCollapsedKey(currentStep.key);
  }, [keyboardVisible, currentStep]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!active || !currentStep) {
      setHole(null);
      setAnchorInfo(ABSENT_ANCHOR);
      return undefined;
    }
    let cancelled = false;
    const viewport = { width, height };
    const keys: TutorialAnchorKey[] = [];
    if (currentStep.anchor) keys.push(currentStep.anchor);
    if (currentStep.doneWhen?.anchorVisible) keys.push(currentStep.doneWhen.anchorVisible);

    const measureAll = async (): Promise<void> => {
      const focused = navigationRef.isReady()
        ? describeRoute(navigationRef.getRootState()).routeKey
        : null;
      const visible: TutorialAnchorKey[] = [];
      let nextHole: Rect | null = null;
      let nextInfo: AnchorInfo = ABSENT_ANCHOR;
      for (const key of keys) {
        for (const entry of pickAnchorEntries(entries, key, focused)) {
          const rect = await entry.measure();
          if (cancelled) return;
          const isStepAnchor = key === currentStep.anchor;
          if (isRectUsable(rect, viewport)) {
            visible.push(key);
            if (isStepAnchor) {
              nextHole = rect;
              nextInfo = { state: 'visible', reveal: entry.reveal };
            }
            break;
          }
          // Mounted on the focused screen but scrolled out of view.
          if (
            isStepAnchor &&
            nextInfo.state === 'absent' &&
            rect &&
            rect.width > 0 &&
            rect.height > 0 &&
            entry.routeKey === focused
          ) {
            nextInfo = { state: 'offscreen', reveal: entry.reveal };
          }
        }
      }
      if (cancelled) return;
      setHole(previous => (sameRect(previous, nextHole) ? previous : nextHole));
      setAnchorInfo(previous =>
        previous.state === nextInfo.state && previous.reveal === nextInfo.reveal
          ? previous
          : nextInfo
      );
      useTutorialStore.getState().setVisibleAnchors(visible);
    };

    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        void measureAll();
      });
    });
    const interval = setInterval(
      () => {
        void measureAll();
      },
      currentStep.mode === 'spotlight' ? SPOTLIGHT_REMEASURE_MS : HINT_REMEASURE_MS
    );
    return () => {
      cancelled = true;
      task.cancel();
      clearInterval(interval);
    };
  }, [active, currentStep, entries, layoutVersion, width, height, keyboardVisible]);

  const presentation =
    active && currentStep
      ? resolvePresentation(currentStep, route, hole ? 'visible' : anchorInfo.state)
      : null;
  const collapsed = currentStep !== null && collapsedKey === currentStep.key;
  // A native-driven fade only reaches a view that is mounted while it runs,
  // so it must restart whenever the mounted element changes.
  const visibleKey = showReplayHint
    ? 'replay'
    : presentation && presentation !== 'hidden' && currentStep
      ? `${currentStep.key}:${presentation}:${collapsed}`
      : null;
  useEffect(() => {
    if (!visibleKey) return;
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
  }, [visibleKey, reduceMotion, opacity]);

  const handleCardLayout = (event: LayoutChangeEvent): void => {
    const { width: cardWidth, height: cardHeight } = event.nativeEvent.layout;
    const next = { width: cardWidth, height: cardHeight };
    setCardSize(previous => (sameSize(previous, next) ? previous : next));
  };

  const handleChipLayout = (event: LayoutChangeEvent): void => {
    const { width: chipWidth, height: chipHeight } = event.nativeEvent.layout;
    const next = { width: chipWidth, height: chipHeight };
    setChipSize(previous => (sameSize(previous, next) ? previous : next));
  };

  if (showReplayHint) {
    return (
      <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity }]}>
        <View style={styles.dim} {...swallowTouches} />
        <View style={styles.center} pointerEvents="box-none">
          <TutorialCard
            title={t('tutorial.replayHint.title')}
            body={t('tutorial.replayHint.body')}
            primaryLabel={t('tutorial.replayHint.ok')}
            onPrimary={() => useTutorialStore.getState().dismissReplayHint()}
            style={{ width: Math.min(CARD_MAX_WIDTH, width - 2 * CARD_MARGIN) }}
          />
        </View>
      </Animated.View>
    );
  }

  if (!active || !currentStep) return null;

  const store = useTutorialStore.getState();
  const stepKey = currentStep.key;
  const position = stepPosition(steps, stepKey);
  const stepLabel =
    position.n > 0
      ? t('tutorial.common.stepOf', { n: position.n, total: position.total })
      : undefined;
  const title = t(currentStep.titleKey);
  const body = t(currentStep.bodyKey);
  const skipAllLabel = t('tutorial.common.skipAll');
  const cardWidth = Math.min(CARD_MAX_WIDTH, width - 2 * CARD_MARGIN);
  const maxBodyHeight = Math.round(height * 0.45);

  if (currentStep.mode === 'card') {
    return (
      <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity }]}>
        <View style={styles.dim} {...swallowTouches} />
        <View style={styles.center} pointerEvents="box-none">
          <TutorialCard
            title={title}
            body={body}
            primaryLabel={t('tutorial.common.start')}
            onPrimary={() => store.completeStep(stepKey)}
            tertiaryLabel={skipAllLabel}
            onTertiary={() => store.skipAll()}
            maxBodyHeight={maxBodyHeight}
            style={{ width: cardWidth }}
          />
        </View>
      </Animated.View>
    );
  }

  if (!presentation || presentation === 'hidden') return null;

  const isInfo = currentStep.kind === 'info';
  const dismissLabel = isInfo ? t('tutorial.common.gotIt') : t('tutorial.common.skipStep');
  const dismiss = (): void => {
    if (isInfo) store.completeStep(stepKey);
    else store.skipStep(stepKey);
  };
  const showMeRoute = currentStep.showMeRoute;
  const onScreen = anchorInfo.state === 'offscreen';
  const reveal = anchorInfo.reveal;
  const showMe =
    onScreen && reveal
      ? reveal
      : showMeRoute && accountType
        ? () => {
            void openRoute(showMeRoute, accountType, userId);
          }
        : undefined;

  if (!hole) {
    return (
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
        pointerEvents="box-none">
        <View
          style={[styles.dock, { bottom: insets.bottom + TAB_BAR_HEIGHT + CARD_MARGIN }]}
          pointerEvents="box-none">
          <TutorialCard
            title={title}
            body={onScreen ? body : undefined}
            stepLabel={stepLabel}
            primaryLabel={showMe ? t('tutorial.common.showMe') : dismissLabel}
            onPrimary={showMe ?? dismiss}
            secondaryLabel={showMe ? dismissLabel : undefined}
            onSecondary={showMe ? dismiss : undefined}
            tertiaryLabel={skipAllLabel}
            onTertiary={() => store.skipAll()}
            style={styles.dockCard}
          />
        </View>
      </Animated.View>
    );
  }

  const viewport = { width, height };
  const padded = padRect(hole, HOLE_PADDING, viewport);
  const placementOptions = {
    gap: CARD_GAP,
    margin: CARD_MARGIN,
    insets: { top: insets.top, bottom: insets.bottom + TAB_BAR_HEIGHT },
  };
  const cardPlacement = placeCard(
    padded,
    { width: cardWidth, height: cardSize?.height ?? CARD_FALLBACK_HEIGHT },
    viewport,
    placementOptions
  );

  if (presentation === 'hint') {
    if (keyboardVisible) return null;
    if (collapsed) {
      const chipPlacement = placeCard(
        padded,
        chipSize ?? CHIP_FALLBACK_SIZE,
        viewport,
        placementOptions
      );
      return (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
          pointerEvents="box-none">
          <TutorialChip
            label={t('tutorial.common.chip', { n: position.n, total: position.total })}
            accessibilityLabel={[stepLabel, title].filter(Boolean).join('. ')}
            accessibilityHint={t('tutorial.common.expand')}
            onPress={() => setCollapsedKey(null)}
            onLayout={handleChipLayout}
            style={[styles.chip, { top: chipPlacement.top }]}
          />
        </Animated.View>
      );
    }
    return (
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
        pointerEvents="box-none">
        <TutorialCard
          title={title}
          body={body}
          stepLabel={stepLabel}
          primaryLabel={t('tutorial.common.gotIt')}
          onPrimary={() => setCollapsedKey(stepKey)}
          secondaryLabel={dismissLabel}
          onSecondary={dismiss}
          tertiaryLabel={skipAllLabel}
          onTertiary={() => store.skipAll()}
          maxBodyHeight={maxBodyHeight}
          onLayout={handleCardLayout}
          style={[
            styles.placedCard,
            { top: cardPlacement.top, left: cardPlacement.left, width: cardWidth },
          ]}
        />
      </Animated.View>
    );
  }

  const holeBottom = padded.y + padded.height;
  const holeRight = padded.x + padded.width;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
      pointerEvents="box-none">
      <View
        style={[styles.backdrop, { top: 0, left: 0, right: 0, height: padded.y }]}
        {...swallowTouches}
      />
      <View
        style={[styles.backdrop, { top: holeBottom, left: 0, right: 0, bottom: 0 }]}
        {...swallowTouches}
      />
      <View
        style={[
          styles.backdrop,
          { top: padded.y, left: 0, width: padded.x, height: padded.height },
        ]}
        {...swallowTouches}
      />
      <View
        style={[
          styles.backdrop,
          { top: padded.y, left: holeRight, right: 0, height: padded.height },
        ]}
        {...swallowTouches}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ring,
          { top: padded.y, left: padded.x, width: padded.width, height: padded.height },
        ]}
      />
      <TutorialCard
        title={title}
        body={body}
        stepLabel={stepLabel}
        primaryLabel={isInfo ? dismissLabel : undefined}
        onPrimary={isInfo ? dismiss : undefined}
        secondaryLabel={isInfo ? undefined : dismissLabel}
        onSecondary={isInfo ? undefined : dismiss}
        tertiaryLabel={skipAllLabel}
        onTertiary={() => store.skipAll()}
        maxBodyHeight={maxBodyHeight}
        onLayout={handleCardLayout}
        style={[
          styles.placedCard,
          { top: cardPlacement.top, left: cardPlacement.left, width: cardWidth },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    zIndex: 100,
    elevation: 100,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  ring: {
    position: 'absolute',
    borderRadius: RADII.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: CARD_MARGIN,
  },
  placedCard: {
    position: 'absolute',
  },
  chip: {
    position: 'absolute',
    right: CARD_MARGIN,
  },
  dock: {
    position: 'absolute',
    left: CARD_MARGIN,
    right: CARD_MARGIN,
    alignItems: 'center',
  },
  dockCard: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
  },
});
