import { memo, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { FishSprite } from '@/components/puzzle/FishSprite';

const SIZE = 104;
const R = 46;
const CIRC = 2 * Math.PI * R;

// Tam ekran modunda arkadan yükselen baloncuklar: x (ekran genişliğine oran), boyut, gecikme, süre.
const BUBBLES = [
  { x: 0.1, size: 8, delay: 0, duration: 5200 },
  { x: 0.24, size: 12, delay: 1400, duration: 6400 },
  { x: 0.4, size: 6, delay: 600, duration: 4800 },
  { x: 0.58, size: 10, delay: 2200, duration: 6000 },
  { x: 0.74, size: 7, delay: 900, duration: 5400 },
  { x: 0.9, size: 11, delay: 1800, duration: 6800 },
];

const Bubble = memo(function Bubble({
  x,
  size,
  delay,
  duration,
  h,
  w,
}: {
  x: number;
  size: number;
  delay: number;
  duration: number;
  h: number;
  w: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
    );
    return () => cancelAnimation(t);
  }, [delay, duration, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - t.value * 0.7),
    transform: [
      { translateY: h * (1 - t.value) },
      { translateX: Math.sin(t.value * Math.PI * 5 + x * 9) * 8 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bubble, { left: x * w, width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
});

// Ortada balık, çevresinde dönen halka. fullscreen: derin mavi su, baloncuklar ve kumla tüm ekranı kaplar.
function FishLoaderBase({ fullscreen = false }: { fullscreen?: boolean }) {
  const { width, height } = useWindowDimensions();
  const spin = useSharedValue(0);
  const bob = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
    bob.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    glow.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => {
      cancelAnimation(spin);
      cancelAnimation(bob);
      cancelAnimation(glow);
    };
  }, [spin, bob, glow]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const fishStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (bob.value - 0.5) * 8 }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + glow.value * 0.14,
    transform: [{ scale: 0.95 + glow.value * 0.15 }],
  }));

  return (
    <View
      pointerEvents="none"
      style={fullscreen ? [StyleSheet.absoluteFill, styles.full] : styles.inline}
    >
      {fullscreen && (
        <>
          {/* Üstten aşağı süzülen ışık huzmesi gibi yumuşak yarı saydam katmanlar */}
          <View style={[styles.ray, { left: width * 0.12, height: height * 0.7, transform: [{ rotate: '12deg' }] }]} />
          <View style={[styles.ray, styles.rayWide, { left: width * 0.5, height: height * 0.8, transform: [{ rotate: '12deg' }] }]} />

          {BUBBLES.map((b, i) => (
            <Bubble key={i} x={b.x} size={b.size} delay={b.delay} duration={b.duration} h={height} w={width} />
          ))}

          {/* Deniz tabanı: kum ve iki yosun */}
          <View style={styles.sand} />
          <View style={[styles.weed, { left: width * 0.14, height: 70 }]} />
          <View style={[styles.weed, { left: width * 0.14 + 12, height: 48 }]} />
          <View style={[styles.weed, { right: width * 0.16, height: 62 }]} />
        </>
      )}

      <View style={styles.box}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={[StyleSheet.absoluteFill, ringStyle]}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.14)" strokeWidth={6} fill="none" />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke="#7fdbff"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${CIRC * 0.28} ${CIRC}`}
              fill="none"
            />
          </Svg>
        </Animated.View>
        <Animated.View style={fishStyle}>
          <FishSprite id={0} width={58} tail={false} />
        </Animated.View>
      </View>
    </View>
  );
}

export const FishLoader = memo(FishLoaderBase);

const styles = StyleSheet.create({
  full: { backgroundColor: '#0b3d5c', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inline: { alignItems: 'center', justifyContent: 'center' },
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: SIZE + 28,
    height: SIZE + 28,
    borderRadius: (SIZE + 28) / 2,
    backgroundColor: '#7fdbff',
  },
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  ray: {
    position: 'absolute',
    top: -40,
    width: 46,
    backgroundColor: 'rgba(127,219,255,0.06)',
  },
  rayWide: { width: 80, backgroundColor: 'rgba(127,219,255,0.045)' },
  sand: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -60,
    height: 120,
    borderRadius: 80,
    backgroundColor: '#b89457',
    opacity: 0.55,
  },
  weed: {
    position: 'absolute',
    bottom: 36,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#2f9e6b',
    opacity: 0.7,
  },
});