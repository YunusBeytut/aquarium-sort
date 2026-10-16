import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
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
  const wasComplete = useRef(false);
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
    if (complete && !wasComplete.current) {
      pulse.value = withSequence(withTiming(1.1, { duration: 130 }), withSpring(1, { damping: 8 }));
      cap.value = withSpring(1, { damping: 9, stiffness: 180 });
    } else if (!complete) {
      cap.value = withTiming(0, { duration: 120 });
    }
    wasComplete.current = complete;
  }, [complete, pulse, cap]);

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
                ) : showFish ? (
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