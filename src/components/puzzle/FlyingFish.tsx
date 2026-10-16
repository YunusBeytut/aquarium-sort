import { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { FishSprite } from './FishSprite';
import { FISH_H, FISH_W } from './Jar';

export type Point = { x: number; y: number };

const FLIGHT_MS = 230;
const RIPPLE_MS = 240;
const LIFT = -9; // seçili balık zaten bu kadar yukarıda durur

type Props = {
  fishId: number;
  from: Point;
  to: Point;
  delay: number;
  onLand: () => void;
  onSettled: () => void;
};

export const FlyingFish = memo(function FlyingFish({
  fishId,
  from,
  to,
  delay,
  onLand,
  onSettled,
}: Props) {
  const p = useSharedValue(0);
  const r = useSharedValue(0);
  const [landed, setLanded] = useState(false);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const arc = Math.min(70, 34 + Math.abs(dx) * 0.12);
  const dir = dx < 0 ? -1 : 1;

  const handleLand = useCallback(() => {
    setLanded(true);
    onLand();
    r.value = withTiming(
      1,
      { duration: RIPPLE_MS, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(onSettled)();
      }
    );
  }, [onLand, onSettled, r]);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(
        1,
        { duration: FLIGHT_MS, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(handleLand)();
        }
      )
    );
    // yalnızca bir kez başlatılır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flyStyle = useAnimatedStyle(() => {
    const t = p.value;
    const s = Math.sin(Math.PI * t);
    return {
      transform: [
        { translateX: from.x + dx * t },
        { translateY: from.y + LIFT * (1 - t) + dy * t - arc * s },
        { rotate: `${dir * 14 * s}deg` },
        { scale: 1 + 0.18 * s },
        { scaleX: dir < 0 && t < 0.85 ? -1 : 1 },
      ],
    };
  });

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - r.value),
    transform: [{ scale: 0.4 + 1.2 * r.value }],
  }));

  if (landed) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[styles.ripple, { left: to.x - 3, top: to.y + FISH_H - 9 }, rippleStyle]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      style={[styles.fly, flyStyle]}
    >
      {/* Uçuş çok kısa: boşta salınım ve kuyruk animasyonu kapalı, bu an için gereksiz yük. */}
      <FishSprite
        id={fishId}
        width={FISH_W}
        phase={fishId * 1.7}
        animated={false}
        tail={false}
        markOwned
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  fly: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FISH_W,
    zIndex: 10,
  },
  ripple: {
    position: 'absolute',
    width: FISH_W + 6,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    zIndex: 10,
  },
});