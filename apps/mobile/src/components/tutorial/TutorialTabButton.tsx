import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import type { TutorialAnchorKey } from '@bystrobarista/core/types/tutorial';
import { TutorialAnchor } from './TutorialAnchor';

type Props = BottomTabBarButtonProps & {
  tutorialKey: TutorialAnchorKey;
  visible?: boolean;
};

export const TutorialTabButton: React.FC<Props> = ({ tutorialKey, visible = true, ...props }) => {
  if (!visible) return null;
  return (
    <TutorialAnchor tutorialKey={tutorialKey} style={styles.flex}>
      <Pressable {...props} />
    </TutorialAnchor>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
