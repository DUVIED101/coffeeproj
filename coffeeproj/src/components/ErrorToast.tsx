import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { COLORS, RADII } from '../config/constants';
import { useErrorToastStore, type ErrorToast as ErrorToastModel } from '../stores/errorToastStore';

const AUTO_DISMISS_MS = 4000;
const SLIDE_IN_MS = 220;
const SLIDE_OUT_MS = 180;
const SWIPE_DISMISS_DISTANCE = 24;

const ICON_BY_KIND = {
  error: 'alert-circle-outline',
  success: 'check-circle-outline',
  info: 'information-outline',
} as const;

const COLOR_BY_KIND = {
  error: COLORS.error ?? '#EF4444',
  success: COLORS.success ?? '#10B981',
  info: COLORS.primary ?? '#3B82F6',
} as const;

type CardProps = {
  toast: ErrorToastModel;
  onDismiss: () => void;
};

const Card: React.FC<CardProps> = ({ toast, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 12);
  const translateY = useRef(new Animated.Value(-160)).current;
  const dismissedRef = useRef(false);
  const { t } = useTranslation();

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    Animated.timing(translateY, {
      toValue: -160,
      duration: SLIDE_OUT_MS,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [translateY, onDismiss]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: SLIDE_IN_MS,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [translateY, dismiss]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_DISMISS_DISTANCE) dismiss();
        else
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
      },
    })
  ).current;

  const tint = COLOR_BY_KIND[toast.kind];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { top: topInset, transform: [{ translateY }] }]}
      {...panResponder.panHandlers}>
      <View style={[styles.card, { borderLeftColor: tint }]}>
        <MaterialCommunityIcons name={ICON_BY_KIND[toast.kind]} size={22} color={tint} />
        <Text style={styles.message} numberOfLines={3} maxFontSizeMultiplier={1.3}>
          {toast.message}
        </Text>
        {toast.onRetry && (
          <TouchableOpacity
            onPress={() => {
              toast.onRetry?.();
              dismiss();
            }}
            hitSlop={8}>
            <Text style={[styles.retry, { color: tint }]} maxFontSizeMultiplier={1.3}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

export const ErrorToast: React.FC = () => {
  const current = useErrorToastStore(s => s.current);
  const dismiss = useErrorToastStore(s => s.dismiss);
  if (!current) return null;
  return <Card key={current.id} toast={current} onDismiss={dismiss} />;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  message: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 18,
  },
  retry: {
    fontSize: 14,
    fontWeight: '600',
  },
});
