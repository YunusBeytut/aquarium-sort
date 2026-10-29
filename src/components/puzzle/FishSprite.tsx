import { memo, useEffect, useMemo } from 'react';
import { Image, type ImageSourcePropType, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import fishData from '../../data/fish.json';
import { useGameStore } from '@/store/gameStore';
import { ART, tailPath as artTail, tailRays } from './FishArt';
import { FISH_IMAGES } from './fishImages';

type Template = 'round' | 'long' | 'flat' | 'fin';

type FishDef = {
  id: number;
  name: string;
  rarity: string;
  biome: string;
  bonusPct: number;
  storeOnly?: boolean; // true: normal düşme havuzunda değil, yalnızca mağazadan alınır
  template: Template;
  palette: { body: string; accent: string; pattern?: 'stripes' | 'dots' };
};

const FISH = fishData as unknown as FishDef[];

// true: kuyruk animasyonu istenmeyen yerlerde (tail={false}: bulmaca, ana ekran) hazır resim kullanılır.
// false: her yerde eski SVG çizimi. Resim görünümünü beğenmezsen tek satırla geri dönersin.
const USE_BITMAP = true;

type Spec = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  bx: number; // kuyruk bağlantı x
  tip: number; // kuyruk ucu x
  spread: number; // kuyruk açıklığı
  dorsal: number; // sırt yüzgeci yüksekliği
  eyeX: number;
  eyeY: number;
  eyeR: number;
};

// viewBox 0 0 60 40, balık sağa bakar
const SPECS: Record<Template, Spec> = {
  round: { cx: 34, cy: 20, rx: 17, ry: 13, bx: 19, tip: 4, spread: 10, dorsal: 5, eyeX: 42, eyeY: 16, eyeR: 3.2 },
  long: { cx: 33, cy: 20, rx: 21, ry: 9, bx: 14, tip: 2, spread: 8, dorsal: 4, eyeX: 46, eyeY: 18, eyeR: 2.6 },
  flat: { cx: 33, cy: 20, rx: 14, ry: 16, bx: 21, tip: 7, spread: 9, dorsal: 6, eyeX: 40, eyeY: 14, eyeR: 3 },
  fin: { cx: 34, cy: 21, rx: 15, ry: 11, bx: 20, tip: 5, spread: 13, dorsal: 10, eyeX: 41, eyeY: 17, eyeR: 3 },
};

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function tailPath(s: Spec, w: number): string {
  'worklet';
  return `M${s.bx} ${s.cy} L${s.tip} ${s.cy - s.spread + w} Q${s.tip + 4} ${s.cy + w * 0.6} ${s.tip} ${s.cy + s.spread + w} Z`;
}

// Sahip olunan balıkları işaretleyen altın yıldız (bulmacada ve bilgi satırında kullanılır).
export function StarIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"
        fill="#ffd54f"
        stroke="#7a5200"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function OwnedStar({ size }: { size: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -size * 0.3,
        right: -size * 0.1,
        width: size,
        height: size,
      }}
    >
      <StarIcon size={size} />
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  id: number;
  width?: number;
  animated?: boolean;
  phase?: number;
  lifted?: boolean;
  flip?: boolean;
  // Kuyruk SVG path'ini her karede animasyonlar (pahalı). Çok balık olan yerlerde false ver.
  tail?: boolean;
  // true ise ve bu balık oyuncuda varsa köşesinde altın yıldız gösterilir (bulmaca ekranı).
  markOwned?: boolean;
};

function FishSpriteSvg({
  id,
  width = 40,
  animated = true,
  phase,
  lifted = false,
  flip = false,
  tail = true,
  markOwned = false,
}: Props) {
  const def = FISH[((id % FISH.length) + FISH.length) % FISH.length];
  // Boolean seçici: yalnızca sahiplik değişince yeniden çizilir.
  const owned = useGameStore((s) => markOwned && (s.ownedFish[def.id] ?? 0) > 0);
  const spec = SPECS[def.template];
  const art = ART[def.id]; // el çizimi türler (0-11 ve mağaza türleri 16-18); yoksa eski şablon çizimi
  const ts = art?.tail; // worklet'e yalnızca düz veri girsin, JSX değil
  const { body, accent, pattern } = def.palette;
  const isFin = def.template === 'fin';
  const ph = phase ?? (id * 1.7) % 6.28;
  const duration = 1200 + (id % 5) * 140;

  const colors = useMemo(
    () => ({ outline: shade(body, -0.45), fin: shade(body, -0.18) }),
    [body]
  );

  const t = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [animated, duration, t]);

  useEffect(() => {
    lift.value = withSpring(lifted ? -9 : 0, { damping: 12, stiffness: 220 });
  }, [lifted, lift]);

  const wrapStyle = useAnimatedStyle(() => {
    const a = t.value * Math.PI * 2 + ph;
    return {
      transform: [
        { translateY: lift.value + Math.sin(a + 1.2) * 1.2 },
        { rotate: `${Math.sin(a) * 3}deg` },
        { scaleX: flip ? -1 : 1 },
      ],
    };
  });

  const tailProps = useAnimatedProps(() => {
    const w = Math.sin(t.value * Math.PI * 2 + ph) * 3.5;
    return { d: ts ? artTail(ts, w) : tailPath(spec, w) };
  });

  const rayProps = useAnimatedProps(() => {
    const w = Math.sin(t.value * Math.PI * 2 + ph) * 3.5;
    return { d: ts ? tailRays(ts, w) : '' };
  });

  const { cx, cy, rx, ry, dorsal, eyeX, eyeY, eyeR } = spec;
  const clipId = `body-${id}`;
  const starSize = Math.max(10, width * 0.26);

  if (art) {
    const tl = art.tail;
    return (
      <Animated.View
        pointerEvents="none"
        renderToHardwareTextureAndroid
        style={[{ width, height: (width * 2) / 3 }, wrapStyle]}
      >
        <Svg width={width} height={(width * 2) / 3} viewBox="0 0 60 40">
          <Defs>{art.defs}</Defs>
          {/* Kuyruğu olmayan türlerde (deniz yıldızı) opacity 0 olur: görünmez path'i boşuna animasyonlama */}
          {(tl.opacity ?? 1) > 0 ? (
            <AnimatedPath
              animatedProps={tail ? tailProps : undefined}
              d={artTail(tl, 0)}
              fill={tl.fill}
              stroke={tl.stroke}
              strokeWidth={0.8}
              strokeLinejoin="round"
              opacity={tl.opacity ?? 1}
            />
          ) : null}
          {tl.rays ? (
            <AnimatedPath
              animatedProps={tail ? rayProps : undefined}
              d={tailRays(tl, 0)}
              stroke={tl.rayColor}
              strokeWidth={0.45}
              opacity={0.5}
              fill="none"
            />
          ) : null}
          {art.body}
        </Svg>
        {owned && <OwnedStar size={starSize} />}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      style={[{ width, height: (width * 2) / 3 }, wrapStyle]}
    >
      <Svg width={width} height={(width * 2) / 3} viewBox="0 0 60 40">
        <Defs>
          <ClipPath id={clipId}>
            <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
          </ClipPath>
        </Defs>

        <AnimatedPath
          animatedProps={tail ? tailProps : undefined}
          d={tailPath(spec, 0)}
          fill={isFin ? accent : colors.fin}
          stroke={colors.outline}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />

        <Path
          d={`M${cx - rx * 0.45} ${cy - ry + 1} Q${cx} ${cy - ry - dorsal * 1.6} ${cx + rx * 0.5} ${cy - ry + 2} Z`}
          fill={isFin ? accent : colors.fin}
          stroke={colors.outline}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        <Path
          d={`M${cx - 3} ${cy + ry - 1} Q${cx} ${cy + ry + 5} ${cx + 6} ${cy + ry - 2} Z`}
          fill={colors.fin}
          stroke={colors.outline}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />

        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={body} stroke={colors.outline} strokeWidth={1} />

        <G clipPath={`url(#${clipId})`}>
          {pattern === 'stripes' && (
            <>
              <Rect x={cx - 7} y={0} width={4} height={40} fill={accent} />
              <Rect x={cx + 2} y={0} width={4} height={40} fill={accent} />
            </>
          )}
          {pattern === 'dots' && (
            <>
              <Circle cx={cx - 6} cy={cy - 3} r={2.3} fill={accent} />
              <Circle cx={cx + 2} cy={cy + 4} r={2.3} fill={accent} />
              <Circle cx={cx - 2} cy={cy - 6} r={1.8} fill={accent} />
              <Circle cx={cx + 7} cy={cy - 1} r={1.8} fill={accent} />
            </>
          )}
          {!pattern && (
            <Ellipse cx={cx} cy={cy + ry * 0.5} rx={rx * 0.65} ry={ry * 0.4} fill={accent} opacity={0.5} />
          )}
          <Ellipse cx={cx - 3} cy={cy - ry * 0.45} rx={rx * 0.45} ry={ry * 0.18} fill="#ffffff" opacity={0.22} />
        </G>

        <Ellipse cx={cx + 1} cy={cy + 3} rx={4} ry={2.2} fill={colors.fin} opacity={0.85} />

        <Circle cx={eyeX} cy={eyeY} r={eyeR} fill="#ffffff" />
        <Circle cx={eyeX + 0.8} cy={eyeY} r={eyeR * 0.55} fill="#1b1b2f" />
        <Circle cx={eyeX + 1.4} cy={eyeY - 0.9} r={eyeR * 0.2} fill="#ffffff" />
      </Svg>
      {owned && <OwnedStar size={starSize} />}
    </Animated.View>
  );
}

// Resim modu: sallanma, lift ve flip animasyonu SVG sürümüyle birebir aynı koddur,
// yalnızca içerik SVG yerine önceden çizilmiş resimdir. Kuyruk animasyonu yoktur (tail={false}).
function FishSpriteBitmap({
  id,
  width = 40,
  animated = true,
  phase,
  lifted = false,
  flip = false,
  markOwned = false,
  source,
}: Props & { source: ImageSourcePropType }) {
  const def = FISH[((id % FISH.length) + FISH.length) % FISH.length];
  const owned = useGameStore((s) => markOwned && (s.ownedFish[def.id] ?? 0) > 0);
  const ph = phase ?? (id * 1.7) % 6.28;
  const duration = 1200 + (id % 5) * 140;

  const t = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [animated, duration, t]);

  useEffect(() => {
    lift.value = withSpring(lifted ? -9 : 0, { damping: 12, stiffness: 220 });
  }, [lifted, lift]);

  const wrapStyle = useAnimatedStyle(() => {
    const a = t.value * Math.PI * 2 + ph;
    return {
      transform: [
        { translateY: lift.value + Math.sin(a + 1.2) * 1.2 },
        { rotate: `${Math.sin(a) * 3}deg` },
        { scaleX: flip ? -1 : 1 },
      ],
    };
  });

  const height = (width * 2) / 3;
  const starSize = Math.max(10, width * 0.26);

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      style={[{ width, height }, wrapStyle]}
    >
      {/* fadeDuration=0: Android'de resmin 300 ms'lik belirme efektini kapatır */}
      <Image source={source} fadeDuration={0} resizeMode="stretch" style={{ width, height }} />
      {owned && <OwnedStar size={starSize} />}
    </Animated.View>
  );
}

// Resmi hazır olan balık (tail={false}) resimle, diğerleri SVG ile çizilir.
function FishSpriteBase(props: Props) {
  const { id, tail = true } = props;
  const def = FISH[((id % FISH.length) + FISH.length) % FISH.length];
  const source = USE_BITMAP && !tail ? FISH_IMAGES[def.id] : undefined;
  return source ? <FishSpriteBitmap {...props} source={source} /> : <FishSpriteSvg {...props} />;
}

export const FishSprite = memo(FishSpriteBase);
export default FishSprite;