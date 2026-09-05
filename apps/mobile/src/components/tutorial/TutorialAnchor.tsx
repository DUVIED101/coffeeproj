import React, { useCallback } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import type { TutorialAnchorKey } from '@bystrobarista/core/types/tutorial';
import { useTutorialAnchor } from './useTutorialAnchor';

type Props = ViewProps & {
  tutorialKey?: TutorialAnchorKey;
};

// Measurable wrapper for tutorial spotlights. Drop it around an element, or
// inside a touchable as an absoluteFill child (pointerEvents="none") when the
// touchable's own layout must stay untouched.
export const TutorialAnchor: React.FC<Props> = ({ tutorialKey, onLayout, children, ...rest }) => {
  const anchor = useTutorialAnchor(tutorialKey);
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
