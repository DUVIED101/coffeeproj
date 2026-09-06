import React, { useCallback } from 'react';
import { View, type LayoutChangeEvent, type ScrollView, type ViewProps } from 'react-native';
import type { TutorialAnchorKey } from '@bystrobarista/core/types/tutorial';
import { useTutorialAnchor } from './useTutorialAnchor';

type Props = ViewProps & {
  tutorialKey?: TutorialAnchorKey;
  // The scroll container the anchor sits in, so "show me" can scroll to it.
  scrollRef?: React.RefObject<ScrollView>;
};

// Measurable wrapper for tutorial spotlights. Drop it around an element, or
// inside a touchable as an absoluteFill child (pointerEvents="none") when the
// touchable's own layout must stay untouched.
export const TutorialAnchor: React.FC<Props> = ({
  tutorialKey,
  scrollRef,
  onLayout,
  children,
  ...rest
}) => {
  const anchor = useTutorialAnchor(tutorialKey, scrollRef);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      anchor.onLayout();
      onLayout?.(event);
    },
    [anchor, onLayout]
  );
  return (
    <View
      ref={anchor.ref}
      collapsable={false}
      onLayout={handleLayout}
      testID={tutorialKey}
      {...rest}>
      {children}
    </View>
  );
};
