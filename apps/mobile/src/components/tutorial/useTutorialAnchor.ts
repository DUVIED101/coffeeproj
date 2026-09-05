import { useCallback, useContext, useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { NavigationRouteContext } from '@react-navigation/native';
import type { TutorialAnchorKey } from '@bystrobarista/core/types/tutorial';
import type { Rect } from '@bystrobarista/core/tutorial/placement';
import { useTutorialAnchorStore } from '../../stores/tutorialAnchorStore';

type TutorialAnchorHandle = {
  ref: React.RefObject<View>;
  onLayout: () => void;
};

export const useTutorialAnchor = (key?: TutorialAnchorKey): TutorialAnchorHandle => {
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
    const id = useTutorialAnchorStore.getState().register({ key, routeKey, measure });
    return () => useTutorialAnchorStore.getState().unregister(id);
  }, [key, routeKey]);

  const onLayout = useCallback(() => {
    if (key) useTutorialAnchorStore.getState().bumpLayoutVersion();
  }, [key]);

  return { ref, onLayout };
};
