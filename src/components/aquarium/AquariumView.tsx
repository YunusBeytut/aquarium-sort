import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { FISH } from '@/data';
import { FishSprite } from '../puzzle/FishSprite';

// Arka plan görseli. Dosya yolu: src/assets/images/aquarium-bg.webp
// (png kullanırsan uzantıyı değiştir).
const BG = require('../../../assets/images/aquarium-bg.webp');
const BG_SRC = Image.resolveAssetSource(BG);
const BG_W = BG_SRC?.width || 940;
const BG_H = BG_SRC?.height || 1672;

// Görselde kum çizgisinin yukarıdan oranı (1405 / 1672). Görseli değiştirirsen ayarla.
const SAND_TOP_RATIO = 0.84;

const FISH_SIZE = 48;
const MAX_VISIBLE = 14; // aynı anda yüzen en fazla balık
const ROTATE_MS = 25000; // bir balığın yerini başkasına bırakma aralığı
const FADE_MS = 700;

// ---------- Dönüşümlü gösterim ----------
// Nadir balıklar sahneye daha sık çıkar.
const RARITY_WEIGHT: Record<string, number> = { common: 1, rare: 1.8, epic: 3, legendary: 4 };
const RARITY_BY_ID = new Map(FISH.map((f) => [f.id, f.rarity] as const));
const weightOf = (id: number) => RARITY_WEIGHT[RARITY_BY_ID.get(id) ?? 'common'] ?? 1;

function pickWeighted(pool: number[]): number {
  let r = Math.random() * pool.reduce((sum, id) => sum + weightOf(id), 0);
  for (const id of pool) {
    r -= weightOf(id);
    if (r <= 0) return id;
  }
  return pool[pool.length - 1];
}

type Slot = { id: number; leaving: boolean; fresh: boolean };

function initialSlots(ids: number[]): Slot[] {
  if (ids.length <= MAX_VISIBLE) return ids.map((id) => ({ id, leaving: false, fresh: false }));
  const pool = [...ids];
  const out: Slot[] = [];
  while (out.length < MAX_VISIBLE) {
    const id = pickWeighted(pool);
    pool.splice(pool.indexOf(id), 1);
    out.push({ id, leaving: false, fresh: false });
  }
  return out;
}

// Sahiplik değişince (yeni balık, sıfırlama) görünen listeyi düzeltir.
function reconcile(prev: Slot[], ids: number[], known: Set<number>): Slot[] {
  const owned = new Set(ids);
  let next = prev.filter((s) => owned.has(s.id));
  const shown = new Set(next.map((s) => s.id));
  for (const id of ids) {
    if (known.has(id) || shown.has(id)) continue; // yeni kazanılan balık hemen görünsün
    if (next.length >= MAX_VISIBLE) {
      shown.delete(next[0].id);
      next = next.slice(1); // en eskisi yerini versin
    }
    next = [...next, { id, leaving: false, fresh: true }];
    shown.add(id);
  }
  while (next.length < MAX_VISIBLE) {
    const pool = ids.filter((id) => !shown.has(id));
    if (!pool.length) break;
    const id = pickWeighted(pool);
    next = [...next, { id, leaving: false, fresh: true }];
    shown.add(id);
  }
  return next.length === prev.length && next.every((s, i) => s === prev[i]) ? prev : next;
}

function useRotation(fishIds: number[], active: boolean): Slot[] {
  // index.tsx her render'da yeni dizi üretiyor; içerik değişmedikçe aynı kalsın.
  const key = fishIds.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ids = useMemo(() => fishIds, [key]);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const known = useRef(new Set(ids));
  const [slots, setSlots] = useState(() => initialSlots(ids));

  useEffect(() => {
    const prevKnown = known.current;
    known.current = new Set(ids);
    setSlots((prev) => reconcile(prev, ids, prevKnown));
  }, [ids]);

  // Aralıklı olarak en eski balığı çıkışa işaretle.
  useEffect(() => {
    if (!active || ids.length <= MAX_VISIBLE) return;
    const iv = setInterval(() => {
      setSlots((prev) => {
        if (prev.some((s) => s.leaving)) return prev;
        const i = prev.findIndex((s) => !s.leaving);
        return i < 0 ? prev : prev.map((s, k) => (k === i ? { ...s, leaving: true } : s));
      });
    }, ROTATE_MS);
    return () => clearInterval(iv);
  }, [active, ids.length]);

  // Solma bitince yerine sırada bekleyen balık girer.
  useEffect(() => {
    if (!slots.some((s) => s.leaving)) return;
    const tm = setTimeout(() => {
      setSlots((prev) => {
        const rest = prev.filter((s) => !s.leaving);
        const shown = new Set(prev.map((s) => s.id));
        const pool = idsRef.current.filter((id) => !shown.has(id));
        return pool.length
          ? [...rest, { id: pickWeighted(pool), leaving: false, fresh: true }]
          : rest;
      });
    }, FADE_MS);
    return () => clearTimeout(tm);
  }, [slots]);

  return slots;
}

type Props = {
  fishIds: number[]; // sahip olunan benzersiz balık id'leri
  height?: number;
  emptyText?: string;
  radius?: number;
  // Balıkların yüzebileceği en üst nokta (üstteki inci/bonus pill'leri için boşluk).
  topInset?: number;
  onFishPress?: (id: number) => void;
};

// ---------- Yüzen balık ----------
type SwimmerProps = {
  id: number;
  areaW: number;
  floorY: number; // kum çizgisinin y konumu
  topInset: number;
  onPress?: (id: number) => void;
  paused: boolean; // ekran odakta değilken (oyun ekranı üstteyken) animasyon durur
  leaving: boolean; // sahneden çıkıyor: solar
  fresh: boolean; // yeni giriyor: sol kenardan başlar, belirir
};

const Swimmer = memo(function Swimmer({
  id,
  areaW,
  floorY,
  topInset,
  onPress,
  paused,
  leaving,
  fresh,
}: SwimmerProps) {
  const range = Math.max(0, areaW - FISH_SIZE);
  const usable = Math.max(0, floorY - topInset - FISH_SIZE - 16);
  const top = topInset + (((id * 53) % 100) / 100) * usable;
  const duration = 14000 + ((id * 1300) % 8000);
  const offset = fresh ? 0 : (id * 0.37) % 1;
  const t = useSharedValue(0);
  const fade = useSharedValue(fresh ? 0 : 1);

  useEffect(() => {
    fade.value = withTiming(leaving ? 0 : 1, { duration: FADE_MS });
  }, [leaving, fade]);

  useEffect(() => {
    if (paused) {
      cancelAnimation(t);
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [duration, paused, t]);

  const style = useAnimatedStyle(() => {
    const p = (t.value + offset) % 1;
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;
    const e = (1 - Math.cos(tri * Math.PI)) / 2;
    return {
      opacity: fade.value,
      transform: [
        { translateX: e * range },
        { translateY: Math.sin(p * Math.PI * 4) * 8 },
        { scaleX: p < 0.5 ? 1 : -1 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.swimmer, { top }, style]}>
      <Pressable onPress={() => onPress?.(id)} hitSlop={8} disabled={leaving}>
        <FishSprite id={id} width={FISH_SIZE} phase={(id * 1.7) % 6.28} tail={false} animated={!paused} />
      </Pressable>
    </Animated.View>
  );
});

// ---------- Baloncuk ----------
const Bubble = memo(function Bubble({
  x,
  size,
  delay,
  duration,
  floorY,
}: {
  x: number;
  size: number;
  delay: number;
  duration: number;
  floorY: number;
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
    opacity: 0.55 * (1 - t.value * 0.6),
    transform: [
      { translateY: floorY * (1 - t.value) },
      { translateX: Math.sin(t.value * Math.PI * 6) * 6 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        { left: x, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
});

const BUBBLES = [
  { x: 0.12, size: 8, delay: 0, duration: 7000 },
  { x: 0.3, size: 5, delay: 2500, duration: 6000 },
  { x: 0.52, size: 10, delay: 1200, duration: 8500 },
  { x: 0.7, size: 6, delay: 4000, duration: 6500 },
  { x: 0.88, size: 9, delay: 800, duration: 7500 },
];

// ---------- Akvaryum ----------
function AquariumViewBase({
  fishIds,
  height = 300,
  emptyText = 'Henüz balığın yok. Level oyna, yumurta aç.',
  radius = 22,
  topInset = 12,
  onFishPress,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const slots = useRotation(fishIds, focused);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  };

  // "cover" gibi ölçeklenir ama alta sabitlenir: kum her ekran oranında altta kalır,
  // fazlalık üstten ve yanlardan kırpılır.
  const bg = useMemo(() => {
    if (!size.w || !size.h) return null;
    const scale = Math.max(size.w / BG_W, size.h / BG_H);
    const width = BG_W * scale;
    const imgH = BG_H * scale;
    return {
      width,
      height: imgH,
      left: (size.w - width) / 2,
      floorY: Math.max(0, size.h - imgH * (1 - SAND_TOP_RATIO)),
    };
  }, [size]);

  return (
    <View style={[styles.tank, { height, borderRadius: radius }]} onLayout={onLayout}>
      {bg && (
        <>
          <Image
            source={BG}
            fadeDuration={0}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              left: bg.left,
              bottom: 0,
              width: bg.width,
              height: bg.height,
            }}
          />

          {BUBBLES.map((b, i) => (
            <Bubble
              key={i}
              x={b.x * size.w}
              size={b.size}
              delay={b.delay}
              duration={b.duration}
              floorY={bg.floorY}
            />
          ))}

          {slots.map((s) => (
            <Swimmer
              key={s.id}
              id={s.id}
              leaving={s.leaving}
              fresh={s.fresh}
              areaW={size.w}
              floorY={bg.floorY}
              topInset={topInset}
              onPress={onFishPress}
              paused={!focused}
            />
          ))}

          {slots.length === 0 && (
            <View
              pointerEvents="none"
              style={[styles.empty, { paddingBottom: size.h - bg.floorY }]}
            >
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export const AquariumView = memo(AquariumViewBase);
export default AquariumView;

const styles = StyleSheet.create({
  tank: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#1b5a8a',
  },
  swimmer: {
    position: 'absolute',
    left: 0,
  },
  bubble: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    textAlign: 'center',
  },
});