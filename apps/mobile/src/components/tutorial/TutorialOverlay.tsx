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
import { stepPosition } from '@bystrobarista/core/tutorial/engine';
import {
  isRectUsable,
  padRect,
  placeCard,
  type Rect,
  type Size,
} from '@bystrobarista/core/tutorial/placement';
import type { TutorialAnchorKey } from '@bystrobarista/core/types/tutorial';
import { navigationRef } from '../../navigation/navigationRef';
import { pickAnchorEntries, useTutorialAnchorStore } from '../../stores/tutorialAnchorStore';
import { TutorialCard } from './TutorialCard';
import { describeRoute, navigateToRoute, toTutorialRoute } from './tutorialBindings';

const CARD_MAX_WIDTH = 360;
const CARD_MARGIN = 16;
const CARD_GAP = 12;
const CARD_FALLBACK_HEIGHT = 180;
const HOLE_PADDING = 6;
const TAB_BAR_HEIGHT = 49;
const SPOTLIGHT_REMEASURE_MS = 250;
const FADE_MS = 180;

const sameRect = (a: Rect | null, b: Rect | null): boolean =>
  a === b ||
  (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

const swallowTouches = { onStartShouldSetResponder: () => true, accessible: false } as const;

export const TutorialOverlay: React.FC = () => {
  const { t } = useTranslation();
  const status = useTutorialStore(s => s.status);
  const showReplayHint = useTutorialStore(s => s.showReplayHint);
  const holdsCount = useTutorialStore(s => s.holds.length);
  const currentStep = useTutorialStore(selectCurrentStep);
  const steps = useTutorialStore(s => s.steps);
  const accountType = useTutorialStore(s => s.accountType);
  const entries = useTutorialAnchorStore(s => s.entries);
  const layoutVersion = useTutorialAnchorStore(s => s.layoutVersion);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [hole, setHole] = useState<Rect | null>(null);
  const [cardSize, setCardSize] = useState<Size | null>(null);
  const [keyboardTick, setKeyboardTick] = useState(0);
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
    const bump = (): void => setKeyboardTick(tick => tick + 1);
    const show = Keyboard.addListener('keyboardDidShow', bump);
    const hide = Keyboard.addListener('keyboardDidHide', bump);
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!active || !currentStep) {
      setHole(null);
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
      for (const key of keys) {
        for (const entry of pickAnchorEntries(entries, key, focused)) {
          const rect = await entry.measure();
          if (cancelled) return;
          if (isRectUsable(rect, viewport)) {
            visible.push(key);
            if (key === currentStep.anchor) nextHole = rect;
            break;
          }
        }
      }
      if (cancelled) return;
      setHole(previous => (sameRect(previous, nextHole) ? previous : nextHole));
      useTutorialStore.getState().setVisibleAnchors(visible);
    };

    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        void measureAll();
      });
    });
    const interval =
      currentStep.mode === 'spotlight'
        ? setInterval(() => {
            void measureAll();
          }, SPOTLIGHT_REMEASURE_MS)
        : null;
    return () => {
      cancelled = true;
      task.cancel();
      if (interval) clearInterval(interval);
    };
  }, [active, currentStep, entries, layoutVersion, width, height, keyboardTick]);

  const visibleKey = showReplayHint ? 'replay' : active && currentStep ? currentStep.key : null;
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
    setCardSize(previous =>
      previous && previous.width === cardWidth && previous.height === cardHeight
        ? previous
        : { width: cardWidth, height: cardHeight }
    );
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

  const isInfo = currentStep.kind === 'info';
  const dismissLabel = isInfo ? t('tutorial.common.gotIt') : t('tutorial.common.skipStep');
  const dismiss = (): void => {
    if (isInfo) store.completeStep(stepKey);
    else store.skipStep(stepKey);
  };
  const showMeRoute = currentStep.showMeRoute;
  const showMe =
    showMeRoute && accountType ? () => navigateToRoute(showMeRoute, accountType) : undefined;

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
  const placement = placeCard(
    padded,
    { width: cardWidth, height: cardSize?.height ?? CARD_FALLBACK_HEIGHT },
    viewport,
    {
      gap: CARD_GAP,
      margin: CARD_MARGIN,
      insets: { top: insets.top, bottom: insets.bottom + TAB_BAR_HEIGHT },
    }
  );
  // A hint must leave the form usable: below the anchor when it fits, else at the top.
  const cardTop =
    currentStep.mode === 'hint' && placement.side !== 'below'
      ? insets.top + CARD_MARGIN
      : placement.top;
  const card = (
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
      style={[styles.placedCard, { top: cardTop, left: placement.left, width: cardWidth }]}
    />
  );

  if (currentStep.mode === 'hint') {
    return (
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
        pointerEvents="box-none">
        {card}
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
      {card}
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
