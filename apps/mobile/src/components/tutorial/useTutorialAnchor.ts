import { useCallback, useContext, useEffect, useRef } from 'react';
import type { ScrollView, View } from 'react-native';
import { NavigationRouteContext } from '@react-navigation/native';
import type { TutorialAnchorKey } from '@bystrobarista/core/types/tutorial';
import type { Rect } from '@bystrobarista/core/tutorial/placement';
import { useTutorialAnchorStore } from '../../stores/tutorialAnchorStore';

type TutorialAnchorHandle = {
  ref: React.RefObject<View>;
  onLayout: () => void;
};

// Leaves room above the revealed element so it does not hug the header.
const REVEAL_TOP_OFFSET = 120;

export const useTutorialAnchor = (
  key?: TutorialAnchorKey,
  scrollRef?: React.RefObject<ScrollView>
): TutorialAnchorHandle => {
  const ref = useRef<View>(null);
  const route = useContext(NavigationRouteContext);
  const routeKey = route?.key ?? null;

  useEffect(() => {
    if (!key) return undefined;
    const measure = (): Promise<Rect | null> =>
      new Promise(resolve => {
        const node = ref.current;
        if (!node) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
      });
    const reveal = scrollRef
      ? (): void => {
          const node = ref.current;
          const scroll = scrollRef.current;
          if (!node || !scroll) return;
          node.measureLayout(
            scroll.getInnerViewNode(),
            (_x, y) => scroll.scrollTo({ y: Math.max(0, y - REVEAL_TOP_OFFSET), animated: true }),
            () => undefined
          );
        }
      : undefined;
    const id = useTutorialAnchorStore.getState().register({ key, routeKey, measure, reveal });
    return () => useTutorialAnchorStore.getState().unregister(id);
  }, [key, routeKey, scrollRef]);

  const onLayout = useCallback(() => {
    if (key) useTutorialAnchorStore.getState().bumpLayoutVersion();
  }, [key]);

  return { ref, onLayout };
};
