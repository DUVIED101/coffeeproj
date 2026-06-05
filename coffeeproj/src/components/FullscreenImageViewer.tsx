import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {
  GestureHandlerRootView,
  NativeViewGestureHandler,
  PanGestureHandler,
  State,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

type Props = {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DISMISS_DISTANCE = SCREEN_H * 0.18;
const DISMISS_VELOCITY = 900;

export const FullscreenImageViewer: React.FC<Props> = ({
  visible,
  photos,
  initialIndex = 0,
  onClose,
}) => {
  const { t } = useTranslation();
  const listRef = useRef<FlatList<string>>(null);
  const panRef = useRef<PanGestureHandler>(null);
  const nativeListRef = useRef<NativeViewGestureHandler>(null);
  const [index, setIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setIsZoomed(false);
      translateY.setValue(0);
    }
  }, [visible, initialIndex, translateY]);

  const onPanGesture = Animated.event([{ nativeEvent: { translationY: translateY } }], {
    useNativeDriver: true,
  });

  const onPanStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { state, translationY, velocityY } = event.nativeEvent;
      if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) return;

      const dismissDown = translationY > DISMISS_DISTANCE || velocityY > DISMISS_VELOCITY;
      const dismissUp = translationY < -DISMISS_DISTANCE || velocityY < -DISMISS_VELOCITY;

      if (dismissDown || dismissUp) {
        const toValue = dismissUp ? -SCREEN_H : SCREEN_H;
        Animated.timing(translateY, {
          toValue,
          duration: 180,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onClose();
        });
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      }
    },
    [translateY, onClose]
  );

  if (photos.length === 0) return null;

  const backdropOpacity = translateY.interpolate({
    inputRange: [-SCREEN_H, 0, SCREEN_H],
    outputRange: [0.2, 1, 0.2],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <PanGestureHandler
          ref={panRef}
          simultaneousHandlers={nativeListRef}
          enabled={!isZoomed}
          onGestureEvent={onPanGesture}
          onHandlerStateChange={onPanStateChange}
          minPointers={1}
          maxPointers={1}
          activeOffsetY={[-8, 8]}
          failOffsetX={[-14, 14]}>
          <Animated.View style={[styles.foreground, { transform: [{ translateY }] }]}>
            <TouchableOpacity
              accessibilityLabel={t('imageViewer.closeA11y', { defaultValue: 'Close' })}
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={12}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>

            <NativeViewGestureHandler ref={nativeListRef} simultaneousHandlers={panRef}>
              <FlatList
                ref={listRef}
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
                keyExtractor={(uri, i) => `${i}-${uri}`}
                onMomentumScrollEnd={e => {
                  const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                  setIndex(next);
                }}
                renderItem={({ item }) => (
                  <ScrollView
                    style={styles.page}
                    contentContainerStyle={styles.pageContent}
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    scrollEnabled={isZoomed}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    onScroll={e => {
                      setIsZoomed(e.nativeEvent.zoomScale > 1.01);
                    }}
                    scrollEventThrottle={32}
                    centerContent>
                    <FastImage
                      source={{ uri: item }}
                      style={styles.image}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                  </ScrollView>
                )}
              />
            </NativeViewGestureHandler>

            {photos.length > 1 && (
              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>
                  {index + 1} / {photos.length}
                </Text>
              </View>
            )}
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  foreground: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  pageContent: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  counterContainer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
