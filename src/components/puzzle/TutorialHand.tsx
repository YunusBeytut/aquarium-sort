import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, G, Rect } from 'react-native-svg';

// Yazısız öğretici eli. Board'un içinde (ölçeklenen tahta katmanında) çizilir; koordinatlar
// tahtanın kendi koordinatlarıdır, uçan balıklarla aynı katmandır.
//
// pick: el kaynak kavanozda belirir, dokunur, hedef kavanoza süzülür ve orada dokunur.
// drop: kaynak zaten seçilmiştir; el yalnızca hedef kavanozda iki kez dokunur.

export type TutorialPoint = { x: number; y: number };

type Props = {
  from: TutorialPoint; // elin başladığı nokta (parmak ucu)
  to: TutorialPoint; // elin varacağı nokta (parmak ucu)
};

const HAND_W = 46;
const HAND_H = 52;
// SVG içinde parmak ucunun konumu: elin bu noktası hedefe oturur.
const TIP_X = 17;
const TIP_Y = 3;
const RING = 56;

// Bir tur süresi (ms). Düşürürsen el hızlanır.
const LOOP_MS = 3400;

const FILL = '#ffffff';
const OUTLINE = 'rgba(8,40,90,0.5)';

// Tüm şekiller önce kalın çizgiyle, sonra dolgu ile çizilir: iç içe geçen parçalar tek siluet olur.
function HandShapes({ stroke }: { stroke: boolean }) {
  return (
    <G
      fill={stroke ? OUTLINE : FILL}
      stroke={stroke ? OUTLINE : 'none'}
      strokeWidth={stroke ? 3.5 : 0}
    >
      <Rect x={7} y={22} width={32} height={27} rx={12} />
      <Rect x={29} y={20} width={8.5} height={16} rx={4.25} />
      <Rect x={22} y={18} width={8.5} height={16} rx={4.25} />
      <Ellipse cx={9.5} cy={34} rx={7} ry={5.2} />
      <Rect x={11.5} y={3} width={11} height={30} rx={5.5} />
    </G>
  );
}

function TutorialHandBase({ from, to }: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [t]);

  const fx = from.x;
  const fy = from.y;
  const tx = to.x;
  const ty = to.y;

  const handStyle = useAnimatedStyle(() => {
    const p = t.value;
    // 0.25 - 0.47 arası kaynaktan hedefe süzülür (yumuşak başlangıç ve bitiş).
    const k = interpolate(p, [0.25, 0.47], [0, 1], Extrapolation.CLAMP);
    const s = k * k * (3 - 2 * k);
    const x = fx + (tx - fx) * s;
    const y = fy + (ty - fy) * s;
    // Belirirken hafifçe aşağıdan yükselir.
    const rise = interpolate(p, [0, 0.1], [14, 0], Extrapolation.CLAMP);
    // İki dokunuş: küçülüp geri gelir.
    const press =
      interpolate(p, [0.12, 0.16, 0.21], [1, 0.86, 1], Extrapolation.CLAMP) *
      interpolate(p, [0.5, 0.54, 0.6], [1, 0.86, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(p, [0, 0.08, 0.72, 0.82], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: x - TIP_X },
        { translateY: y - TIP_Y + rise },
        { scale: press },
      ],
    };
  });

  // Dokunma halkaları: büyüyüp sönen yumuşak daireler.
  const ringA = useAnimatedStyle(() => {
    const k = interpolate(t.value, [0.14, 0.36], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: k > 0 ? (1 - k) * 0.6 : 0,
      transform: [
        { translateX: fx - RING / 2 },
        { translateY: fy - RING / 2 },
        { scale: 0.45 + k * 1.1 },
      ],
    };
  });

  const ringB = useAnimatedStyle(() => {
    const k = interpolate(t.value, [0.52, 0.74], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: k > 0 ? (1 - k) * 0.6 : 0,
      transform: [
        { translateX: tx - RING / 2 },
        { translateY: ty - RING / 2 },
        { scale: 0.45 + k * 1.1 },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View style={[styles.ring, ringA]} />
      <Animated.View style={[styles.ring, ringB]} />
      <Animated.View style={[styles.hand, handStyle]}>
        <Svg width={HAND_W} height={HAND_H} viewBox={`0 0 ${HAND_W} ${HAND_H}`}>
          <HandShapes stroke />
          <HandShapes stroke={false} />
        </Svg>
      </Animated.View>
    </View>
  );
}

export const TutorialHand = memo(TutorialHandBase);
export default TutorialHand;

const styles = StyleSheet.create({
  // Tahtanın tamamını kaplayan, dokunmaları geçiren katman (koordinatlar tahtayla aynıdır).
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hand: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: HAND_W,
    height: HAND_H,
    zIndex: 20,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    zIndex: 19,
  },
});