import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADII } from '../config/constants';
import { useToastStore } from '../stores/toastStore';
import { dispatchPayload } from '../navigation/navigationRef';
import type { Notification, NotificationKind } from '../types/notification';

const AUTO_DISMISS_MS = 4000;
const SLIDE_IN_MS = 220;
const SLIDE_OUT_MS = 180;
const SWIPE_DISMISS_DISTANCE = 24;

const ICON_BY_KIND: Record<NotificationKind, string> = {
  new_message: 'message-text-outline',
  application_accepted: 'check-circle-outline',
  application_rejected: 'close-circle-outline',
  work_completion_requested: 'clock-outline',
  work_completion_confirmed: 'briefcase-check-outline',
  new_application: 'account-plus-outline',
  application_withdrawn: 'account-remove-outline',
  shift_cancelled: 'calendar-remove-outline',
  new_review: 'star-outline',
  conversation_started: 'message-plus-outline',
  job_offer_received: 'briefcase-plus-outline',
  job_offer_accepted: 'briefcase-check-outline',
  job_offer_declined: 'briefcase-remove-outline',
};

type ToastCardProps = {
  notification: Notification;
  onDismiss: () => void;
};

const ToastCard = React.memo<ToastCardProps>(({ notification, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 12);
  const translateY = useRef(new Animated.Value(-160)).current;
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    Animated.timing(translateY, {
      toValue: -160,
      duration: SLIDE_OUT_MS,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [onDismiss, translateY]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: SLIDE_IN_MS,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismiss, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy < -2,
      onPanResponderMove: (_e, g) => {
        if (g.dy < 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -SWIPE_DISMISS_DISTANCE) {
          dismiss();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    dispatchPayload({
      kind: notification.kind,
      title: notification.title ?? undefined,
      body: notification.body ?? undefined,
      userInteraction: true,
      data: notification.data,
    });
    dismiss();
  }, [dismiss, notification]);

  return (
    <Animated.View
      style={[styles.absolute, { top: topInset, transform: [{ translateY }] }]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}>
      <TouchableWithoutFeedback onPress={handlePress} accessibilityRole="button">
        <View style={styles.card} testID="in-app-toast">
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={ICON_BY_KIND[notification.kind]}
              size={22}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.body}>
            {notification.title && (
              <Text style={styles.title} numberOfLines={1}>
                {notification.title}
              </Text>
            )}
            {notification.body && (
              <Text style={styles.bodyText} numberOfLines={2}>
                {notification.body}
              </Text>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
});

export const InAppToast: React.FC = () => {
  const current = useToastStore(s => s.current);
  const dismiss = useToastStore(s => s.dismiss);

  if (!current) return null;

  return <ToastCard key={current.id} notification={current} onDismiss={dismiss} />;
};

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    marginHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 13,
    color: COLORS.text,
  },
});
