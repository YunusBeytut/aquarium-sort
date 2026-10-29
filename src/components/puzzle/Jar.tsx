import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FishSprite } from './FishSprite';

// Eski gri kutu renkleri (başka dosyalar import ediyorsa kırılmasın diye duruyor).
export const FISH_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6',
  '#e67e22', '#1abc9c', '#ec407a', '#8d6e63', '#78909c',
  '#cddc39', '#00bcd4', '#5c6bc0', '#ff7043', '#26a69a', '#ab47bc',
];

export const BALL_SIZE = 36; // bir balık satırının yüksekliği
export const FISH_W = 46;
export const FISH_H = (FISH_W * 2) / 3;
export const JAR_W = FISH_W + 8;
export const JAR_MARGIN_TOP = 10;
export const JAR_BORDER = 3;
const GAP = 4;

// Balıklar (kademeli çizilince) bu sürede yumuşakça belirir. 0 yaparsan fade kapanır.
const FISH_FADE_MS = 180;

// Seçilince kavanozun ne kadar büyüyeceği. 1.05 = %5 (çok hafif). Daha belirgin istersen 1.08 yap.
const SELECT_SCALE = 1.05;

// Kavanoz tamamlanınca yükselen baloncuklar: x (kavanoz genişliğine oran), boyut, başlama gecikmesi (0-0.4), yükselme (kavanoz yüksekliğine oran).
const BURST_MS = 2600;
// Baloncuklar son balığın indiği kareden ayrı mount edilir (takılmayı önler).
const BURST_START_DELAY_MS = 160;
// Aynı anda çizilen baloncuk sayısı (BURST dizisinden ilk N tanesi).
const BURST_COUNT = 10;
const BURST = [
  { x: 0.12, s: 7, d: 0.0, r: 1.4 },
  { x: 0.3, s: 11, d: 0.04, r: 1.7 },
  { x: 0.5, s: 6, d: 0.08, r: 1.3 },
  { x: 0.7, s: 10, d: 0.02, r: 1.8 },
  { x: 0.86, s: 8, d: 0.1, r: 1.5 },
  { x: 0.2, s: 5, d: 0.16, r: 1.6 },
  { x: 0.42, s: 12, d: 0.12, r: 1.9 },
  { x: 0.62, s: 7, d: 0.2, r: 1.4 },
  { x: 0.78, s: 5, d: 0.22, r: 1.7 },
  { x: 0.36, s: 8, d: 0.26, r: 1.5 },
  { x: 0.56, s: 6, d: 0.3, r: 1.8 },
  { x: 0.9, s: 9, d: 0.34, r: 1.5 },
  { x: 0.08, s: 6, d: 0.14, r: 1.6 },
  { x: 0.46, s: 9, d: 0.38, r: 1.7 },
  { x: 0.68, s: 5, d: 0.06, r: 1.9 },
  { x: 0.24, s: 10, d: 0.32, r: 1.4 },
  { x: 0.82, s: 6, d: 0.28, r: 1.6 },
  { x: 0.52, s: 7, d: 0.18, r: 2.0 },
];

function BurstBubble({
  burst,
  x,
  size,
  delay,
  rise,
  jarH,
}: {
  burst: SharedValue<number>;
  x: number;
  size: number;
  delay: number;
  rise: number;
  jarH: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (burst.value - delay) / 0.6));
    return {
      // hızlı belirir, uzun süre görünür kalır, sonda söner
      opacity: Math.min(1, t * 8, (1 - t) * 3.5) * 0.9,
      transform: [
        { translateY: -t * rise * jarH },
        { translateX: Math.sin(t * 7 + x * 10) * 5 },
        { scale: 0.6 + 0.5 * t },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.burstBubble,
        { left: x * JAR_W - size / 2, top: JAR_MARGIN_TOP + jarH - 14 - size, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

export function jarHeight(capacity: number): number {
  return capacity * (BALL_SIZE + GAP) + GAP * 2;
}

// Bir kavanozun sarmalayıcısının üstünden, index'inci balık satırının üst kenarına uzaklık.
export function slotTopInJar(capacity: number, index: number): number {
  const bottom = JAR_MARGIN_TOP + jarHeight(capacity) - JAR_BORDER - GAP;
  return bottom - (index + 1) * BALL_SIZE - index * GAP;
}

type Props = {
  fish: number[];
  capacity: number;
  selected: boolean;
  hint: 'from' | 'to' | null;
  invalid: boolean;
  hiddenTop?: number; // uçarak gelen, henüz inmemiş balık sayısı
  hiddenBottom?: number; // alttaki gizli balık sayısı ("?" olarak çizilir)
  complete?: boolean; // kavanoz tek türle tam dolu
  animated?: boolean; // balıkların boşta salınım animasyonu
  showFish?: boolean; // false iken balıklar çizilmez (çerçeve hemen görünür, balıklar sonra gelir)
  onPress: () => void;
};

function topGroupCount(fish: number[]): number {
  if (!fish.length) return 0;
  const top = fish[fish.length - 1];
  let n = 0;
  for (let i = fish.length - 1; i >= 0 && fish[i] === top; i--) n++;
  return n;
}

function JarBase({
  fish,
  capacity,
  selected,
  hint,
  invalid,
  hiddenTop = 0,
  hiddenBottom = 0,
  complete = false,
  animated = true,
  showFish = true,
  onPress,
}: Props) {
  const height = jarHeight(capacity);
  const borderColor = invalid
    ? '#ff5252'
    : selected
      ? '#ffeb3b'
      : hint === 'from'
        ? '#69f0ae'
        : hint === 'to'
          ? '#40c4ff'
          : complete
            ? '#80cbc4'
            : '#b0bec5';

  const shake = useSharedValue(0);
  const pulse = useSharedValue(1);
  const selectScale = useSharedValue(1);
  const cap = useSharedValue(0);
  const burst = useSharedValue(1);
  const wasComplete = useRef(false);
  const [burstOn, setBurstOn] = useState(false);
  const fishFade = useSharedValue(showFish ? 1 : 0);

  useEffect(() => {
    if (invalid) {
      shake.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 80 }),
        withTiming(-4, { duration: 70 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [invalid, shake]);

  // Seçilince hafifçe büyür (yaylı), seçim kalkınca yumuşakça eski boyuta döner.
  useEffect(() => {
    selectScale.value = selected
      ? withSpring(SELECT_SCALE, { damping: 12, stiffness: 260, mass: 0.6 })
      : withTiming(1, { duration: 140 });
  }, [selected, selectScale]);

  useEffect(() => {
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    if (complete && !wasComplete.current) {
      pulse.value = withSequence(withTiming(1.1, { duration: 130 }), withSpring(1, { damping: 8 }));
      cap.value = withSpring(1, { damping: 9, stiffness: 180 });
      // Baloncuklar, son balığın indiği kareden ayrı mount edilir.
      startTimer = setTimeout(() => {
        setBurstOn(true);
        burst.value = 0;
        burst.value = withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.quad) });
        endTimer = setTimeout(() => setBurstOn(false), BURST_MS + 100);
      }, BURST_START_DELAY_MS);
    } else if (!complete) {
      cap.value = withTiming(0, { duration: 120 });
      setBurstOn(false);
    }
    wasComplete.current = complete;
    return () => {
      if (startTimer) clearTimeout(startTimer);
      if (endTimer) clearTimeout(endTimer);
    };
  }, [complete, pulse, cap, burst]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: pulse.value * selectScale.value }],
  }));

  useEffect(() => {
    fishFade.value = withTiming(showFish ? 1 : 0, { duration: FISH_FADE_MS });
  }, [showFish, fishFade]);

  const fishFadeStyle = useAnimatedStyle(() => ({ opacity: fishFade.value }));

  const capStyle = useAnimatedStyle(() => ({
    opacity: cap.value,
    transform: [{ translateY: (1 - cap.value) * -14 }],
  }));

  const liftFrom = fish.length - topGroupCount(fish);

  return (
    // onPressIn: parmak değdiği anda tepki verir, bırakmayı beklemez (daha akıcı his).
    <Pressable onPressIn={onPress} hitSlop={6}>
      <Animated.View style={wrapStyle}>
        <Animated.View pointerEvents="none" style={[styles.cap, capStyle]} />
        <View
          style={[
            styles.jar,
            { height, borderColor },
            complete && styles.jarComplete,
          ]}
        >
          <Animated.View style={[styles.fishLayer, fishFadeStyle]}>
            {fish.map((id, index) => (
              <View
                key={index}
                style={[styles.slot, index >= fish.length - hiddenTop && styles.hidden]}
              >
                {index < hiddenBottom ? (
                  <Text style={styles.question}>?</Text>
                ) : showFish && index < fish.length - hiddenTop ? (
                  // Henüz inmemiş (uçan) balığın yeri boş kalır; sprite inince tek tek mount edilir,
                  // böylece çok balıklı hamlede hepsi aynı karede mount edilip takılma yapmaz.
                  <FishSprite
                    id={id}
                    width={FISH_W}
                    tail={false}
                    animated={animated}
                    markOwned
                    phase={(index * 0.9 + id * 1.7) % 6.28}
                    lifted={selected && index >= liftFrom}
                  />
                ) : null}
              </View>
            ))}
          </Animated.View>
        </View>
        {burstOn &&
          BURST.slice(0, BURST_COUNT).map((b, i) => (
            <BurstBubble key={i} burst={burst} x={b.x} size={b.s} delay={b.d} rise={b.r} jarH={height} />
          ))}
      </Animated.View>
    </Pressable>
  );
}

export const Jar = memo(JarBase);

const styles = StyleSheet.create({
  jar: {
    width: JAR_W,
    marginTop: JAR_MARGIN_TOP,
    borderWidth: JAR_BORDER,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: GAP,
    alignItems: 'center',
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
    gap: GAP,
  },
  // Slotları tek katmanda toplar (jar ile aynı dizilim), fade tek yerden uygulanır.
  fishLayer: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
    gap: GAP,
  },
  jarComplete: {
    backgroundColor: 'rgba(128,203,196,0.16)',
  },
  cap: {
    position: 'absolute',
    top: 3,
    left: -3,
    width: JAR_W + 6,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#80cbc4',
    zIndex: 2,
  },
  burstBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    zIndex: 3,
  },
  slot: {
    height: BALL_SIZE,
    width: FISH_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    opacity: 0,
  },
  question: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,20,50,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});