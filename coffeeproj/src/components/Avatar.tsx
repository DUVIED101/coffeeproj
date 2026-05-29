import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../config/constants';

type AvatarProps = {
  size: number;
  uri?: string | null;
  /**
   * Used for the fallback bubble when `uri` is missing. Pass either the full
   * name ("Maria Ivanova") or the business name ("Coffee & Co.") — the first
   * letter (or two for personal names) renders inside the circle.
   */
  name?: string | null;
};

const computeInitials = (name?: string | null): string => {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
};

export const Avatar = React.memo<AvatarProps>(({ size, uri, name }) => {
  const radius = size / 2;
  const containerStyle = useMemo(
    () => ({ width: size, height: size, borderRadius: radius }),
    [size, radius]
  );
  const fontSize = Math.max(11, Math.round(size * 0.4));

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, containerStyle]} />;
  }
  return (
    <View style={[styles.fallback, containerStyle]}>
      <Text style={[styles.initials, { fontSize }]}>{computeInitials(name)}</Text>
    </View>
  );
});
Avatar.displayName = 'Avatar';

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  fallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: COLORS.background,
    fontWeight: '700',
  },
});
