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
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SoundManager } from '@/audio/SoundManager';
import { DECOR, FISH } from '@/data';
import { ACCESSORY_IMAGES, getAquariumBackground } from '@/data/decorImages';
import { resolveAquariumBackgroundId } from '@/game/decor';
import type { FishReaction } from '@/game/types';
import { useGameStore } from '@/store/gameStore';
import { FishSprite } from '../puzzle/FishSprite';

// Akvaryum arka planı oyuncunun seçtiği akvaryum arka planından gelir (diğer ekran arka planlarından
// bağımsız). Görsel ve kum çizgisi oranı src/data/decorImages.ts içindeki AQUARIUM_BACKGROUNDS'ta durur.
const FALLBACK_BG_W = 940;
const FALLBACK_BG_H = 1672;

const FISH_SIZE = 48;
const MAX_VISIBLE = 14; // aynı anda yüzen en fazla balık
const ROTATE_MS = 25000; // bir balığın yerini başkasına bırakma aralığı
const FADE_MS = 700;
const SELECTED_SCALE = 1.3; // tıklanan balığın büyüme oranı
const SCALE_MS = 220;

// ---------- Dönüşümlü gösterim ----------
// Nadir balıklar sahneye daha sık çıkar.
const RARITY_WEIGHT: Record<string, number> = { common: 1, rare: 1.8, epic: 3, legendary: 4 };
const RARITY_BY_ID = new Map(FISH.map((f) => [f.id, f.rarity] as const));
const REACTION_BY_ID = new Map(FISH.map((f) => [f.id, f.reaction ?? 'wiggle'] as const));
const REACT_MS = 750;
const LOVE_MS = 10000; // beslenen balığın üstündeki yarı saydam kalbin kalma süresi
const LOVE_ALPHA = 0.55; // bu kalbin saydamlığı
const EAT_MS = 2400; // yem yeme animasyonunun toplam süresi (düşme + çiğneme + kalpler)
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
  // Seçili balık: yüzmeyi bırakır ve biraz büyür.
  selectedId?: number | null;
  // Kumun üstünde duran aksesuar id'leri (dokununca açılıp kapanır).
  accessories?: string[];
  // Besle'ye basılınca değişir: o balık yem yer ve kalpler çıkarır. n her beslemede artar.
  feedRequest?: { id: number; n: number } | null;
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
  selected: boolean; // tıklandı: durur ve büyür
  feedN: number; // bu balık beslendikçe artar (başka balıklarda 0): yem yeme animasyonu oynar
};

// Efekt view'ları yalnızca gerektiğinde mount edilir: her balıkta sürekli duran onlarca görünmez
// view ve animasyon stili, düşük cihazlarda açılışı ve belleği gereksiz yorar.

// Baloncuk tepkisi: yalnızca reaction'ı 'bubbles' olan balıklarda mount edilir.
const BubbleFx = memo(function BubbleFx({ react }: { react: SharedValue<number> }) {
  const bubbleStyles = [0, 1, 2].map((i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const t = Math.min(1, Math.max(0, react.value * 1.4 - i * 0.2));
      return {
        opacity: Math.sin(Math.PI * t) * 0.85,
        transform: [{ translateY: -t * (18 + i * 8) }, { translateX: Math.sin(t * 6 + i) * 3 }],
      };
    })
  );
  return (
    <>
      {bubbleStyles.map((bs, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[styles.reactBubble, { left: FISH_SIZE * (0.78 + i * 0.06), top: 4 + i * 2 }, bs]}
        />
      ))}
    </>
  );
});

// Besleme efekti: düşen yem taneleri, yükselen kalpler ve balığın üstünde kalan yarı saydam kalp.
// Yalnızca balık beslenirken mount edilir, efekt bitince kaldırılır (FX_MS).
const FX_MS = EAT_MS * 0.7 + 500 + LOVE_MS + 700 + 300;

const FeedFx = memo(function FeedFx({
  eat,
  love,
}: {
  eat: SharedValue<number>;
  love: SharedValue<number>;
}) {
  const loveStyle = useAnimatedStyle(() => ({
    opacity: love.value,
    transform: [{ scale: 0.85 + (love.value / LOVE_ALPHA) * 0.15 }],
  }));

  const grainStyles = [0, 1, 2].map((i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const g = Math.min(1, Math.max(0, (eat.value / 0.35) * 1.1 - i * 0.12));
      return {
        opacity: eat.value > 0 && eat.value < 1 && g < 1 ? 1 : 0,
        transform: [{ translateY: -44 + g * 56 }, { translateX: Math.sin(g * 7 + i) * 4 }],
      };
    })
  );

  const heartStyles = [0, 1, 2].map((i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      // Her kalp animasyon bitmeden h = 1'e ulaşır (opacity 0), en geç doğan da.
      const h = Math.min(1, Math.max(0, ((eat.value - 0.4) / 0.6) * 1.5 - i * 0.15));
      return {
        opacity: eat.value >= 1 ? 0 : Math.sin(Math.PI * h),
        transform: [
          { translateY: -h * (34 + i * 12) },
          { translateX: Math.sin(h * 5 + i * 2) * 7 + (i - 1) * 6 },
          { scale: 0.7 + Math.sin(Math.PI * h) * 0.5 },
        ],
      };
    })
  );

  return (
    <>
      {grainStyles.map((gs, i) => (
        <Animated.View
          key={`g${i}`}
          pointerEvents="none"
          style={[styles.grain, { left: FISH_SIZE * (0.66 + i * 0.1) }, gs]}
        />
      ))}
      <Animated.Text pointerEvents="none" style={[styles.loveHeart, loveStyle]}>
        ♥
      </Animated.Text>
      {heartStyles.map((hs, i) => (
        <Animated.Text
          key={`h${i}`}
          pointerEvents="none"
          style={[styles.heart, { left: FISH_SIZE * (0.3 + i * 0.2) }, hs]}
        >
          ♥
        </Animated.Text>
      ))}
    </>
  );
});

const Swimmer = memo(function Swimmer({
  id,
  areaW,
  floorY,
  topInset,
  onPress,
  paused,
  leaving,
  fresh,
  selected,
  feedN,
}: SwimmerProps) {
  const range = Math.max(0, areaW - FISH_SIZE);
  const usable = Math.max(0, floorY - topInset - FISH_SIZE - 16);
  const top = topInset + (((id * 53) % 100) / 100) * usable;
  const duration = 14000 + ((id * 1300) % 8000);
  const offset = fresh ? 0 : (id * 0.37) % 1;
  const t = useSharedValue(0);
  const fade = useSharedValue(fresh ? 0 : 1);
  const grow = useSharedValue(1);
  const react = useSharedValue(0);
  const kind: FishReaction = REACTION_BY_ID.get(id) ?? 'wiggle';

  const play = useCallback(
    (delay = 0) => {
      react.value = 0;
      react.value = withDelay(delay, withTiming(1, { duration: REACT_MS, easing: Easing.out(Easing.quad) }));
    },
    [react]
  );

  // Besle'ye basılınca: yem balığın ağzına düşer, balık çiğner, kalpler çıkar.
  // eat 0 → 1: 0-0.35 yem düşer, 0.35-0.6 çiğneme, 0.4-1 kalpler.
  const eat = useSharedValue(0);
  // Beslenen balığın üstünde tek, yarı saydam bir kalp bir süre kalır, sonra solar.
  const love = useSharedValue(0);
  // Efekt view'ları yalnızca besleme sürerken mount edilir.
  const [fxOn, setFxOn] = useState(false);
  useEffect(() => {
    if (feedN <= 0) return;
    setFxOn(true);
    const off = setTimeout(() => setFxOn(false), FX_MS);
    // Her kalp doğarken kısa bir "pop" çalar (kalp i, eat = 0.4 + i * 0.06 anında başlar).
    const pops = [0, 1, 2].map((i) =>
      setTimeout(() => SoundManager.play('heartPop'), EAT_MS * (0.4 + i * 0.06))
    );
    eat.value = 0;
    eat.value = withTiming(1, { duration: EAT_MS, easing: Easing.linear });
    love.value = 0;
    love.value = withSequence(
      withDelay(EAT_MS * 0.7, withTiming(LOVE_ALPHA, { duration: 500 })),
      withDelay(LOVE_MS, withTiming(0, { duration: 700 }))
    );
    return () => {
      clearTimeout(off);
      pops.forEach(clearTimeout);
      cancelAnimation(eat);
      cancelAnimation(love);
    };
  }, [feedN, eat, love]);

  // Hafif sallanma (±3° eğim, ±1.2 px zıplama). Eskiden FishSprite içinde ikinci bir animasyondu;
  // artık balığın tek animasyon stiline katılır, böylece balık başına kare başı tek güncelleme olur.
  // Süre ve faz FishSprite'takiyle aynı. Yüzme durunca (seçili) sallanma sürer, ekran odakta
  // değilken durur.
  const swayDur = 1200 + (id % 5) * 140;
  const swayPh = (id * 1.7) % 6.28;
  const sway = useSharedValue(0);
  useEffect(() => {
    if (paused) {
      cancelAnimation(sway);
      sway.value = 0;
      return;
    }
    sway.value = 0;
    sway.value = withRepeat(withTiming(1, { duration: swayDur, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(sway);
  }, [paused, swayDur, sway]);

  const frozen = paused || selected;

  useEffect(() => {
    fade.value = withTiming(leaving ? 0 : 1, { duration: FADE_MS });
  }, [leaving, fade]);

  useEffect(() => {
    grow.value = withTiming(selected ? SELECTED_SCALE : 1, {
      duration: SCALE_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [selected, grow]);

  useEffect(() => {
    if (frozen) {
      cancelAnimation(t); // bulunduğu konumda kalır
      return;
    }
    // Kaldığı yerden devam eder: önce turu bitirir, sonra döngüye girer.
    const cur = t.value;
    t.value = withSequence(
      withTiming(1, { duration: Math.max(1, duration * (1 - cur)), easing: Easing.linear }),
      withTiming(0, { duration: 0 }),
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
    );
    return () => cancelAnimation(t);
  }, [duration, frozen, t]);

  const style = useAnimatedStyle(() => {
    const p = (t.value + offset) % 1;
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;
    const e = (1 - Math.cos(tri * Math.PI)) / 2;
    const r = react.value;
    const bump = Math.sin(Math.PI * r); // 0 → 1 → 0
    const dir = p < 0.5 ? 1 : -1; // balığın baktığı yön
    // wiggle: kuyruğunu sallar gibi hızlı, sönümlü sağa-sola titreme (burun yönüne göre)
    // dive: meraklı bir şekilde burnunu aşağı eğip hafifçe dalar, sonra toparlanır
    // spin: kendi etrafında döner (deniz yıldızı)
    // bubbles: titreşim yok, baloncuk çıkarır (aşağıda çizilir)
    let rot = 0;
    let dy = 0;
    if (kind === 'wiggle') rot = Math.sin(r * Math.PI * 6) * (1 - r) * 14 * dir;
    else if (kind === 'dive') {
      rot = bump * 16 * dir;
      dy = bump * 7;
    } else if (kind === 'spin') rot = r * 360;
    // Çiğneme: yem düştükten sonra balık birkaç kez hafifçe şişip sönerek ağzını oynatır.
    // Sallanma: FishSprite animated={false} iken kendi sabit eğimini (t=0) bıraktığı için o sabit
    // kısım çıkarılır; toplam görüntü eski iki katmanlı sürümle aynıdır.
    const sa = sway.value * Math.PI * 2 + swayPh;
    const swayRot = (Math.sin(sa) - Math.sin(swayPh)) * 3;
    const swayY = (Math.sin(sa + 1.2) - Math.sin(swayPh + 1.2)) * 1.2;
    const ev = eat.value;
    const chew = ev > 0.35 && ev < 0.62 ? Math.abs(Math.sin(((ev - 0.35) / 0.27) * Math.PI * 3)) * 0.1 : 0;
    return {
      opacity: fade.value,
      transform: [
        { translateX: e * range },
        { translateY: Math.sin(p * Math.PI * 4) * 8 + dy + swayY },
        { rotate: `${rot + swayRot}deg` },
        { scaleX: dir },
        { scale: grow.value * (1 + chew) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.swimmer, { top, zIndex: selected ? 10 : 0 }, style]}>
      <Pressable
        onPress={() => {
          play();
          onPress?.(id);
        }}
        hitSlop={8}
        disabled={leaving}
      >
        <FishSprite id={id} width={FISH_SIZE} phase={swayPh} tail={false} animated={false} />
      </Pressable>
      {kind === 'bubbles' && <BubbleFx react={react} />}
      {fxOn && <FeedFx eat={eat} love={love} />}
    </Animated.View>
  );
});

// ---------- Aksesuar ----------
const ACC_W = 64;
const ACC_OPEN_MS = 2200;
const SLOT_X = { left: 0.17, right: 0.83 };
// Varsayılandan (ACC_W) farklı boyutlu aksesuarlar.
const ACC_SIZE: Record<string, number> = { 'acc-ship': 88 };

const Accessory = memo(function Accessory({
  id,
  slot,
  areaW,
  floorY,
}: {
  id: string;
  slot: 'left' | 'right';
  areaW: number;
  floorY: number;
}) {
  const img = ACCESSORY_IMAGES[id];
  const sz = ACC_SIZE[id] ?? ACC_W;
  const [open, setOpen] = useState(false);
  const pop = useSharedValue(1);
  const rise = useSharedValue(1);

  const bubbles = [0, 1, 2].map((i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const t = Math.min(1, Math.max(0, rise.value * 1.3 - i * 0.15));
      return {
        opacity: Math.sin(Math.PI * t) * 0.85,
        transform: [{ translateY: -t * (34 + i * 12) }, { translateX: Math.sin(t * 6 + i * 2) * 5 }],
      };
    })
  );
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  if (!img) return null;

  const onPress = () => {
    // Basınca açılır, tekrar basınca kapanır.
    const next = !open;
    setOpen(next);
    // Hem açarken hem kapatırken çalar. Ayarlardan ses kapalıysa SoundManager çalmaz.
    if (id === 'acc-clam') SoundManager.play('clam');
    else if (id === 'acc-chest') SoundManager.play('chest');
    pop.value = withSequence(withTiming(1.08, { duration: 120 }), withTiming(1, { duration: 160 }));
    if (next) {
      rise.value = 0;
      rise.value = withTiming(1, { duration: ACC_OPEN_MS, easing: Easing.out(Easing.quad) });
    }
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        position: 'absolute',
        width: sz,
        height: sz,
        left: areaW * SLOT_X[slot] - sz / 2,
        top: floorY - sz + Math.round(sz * 0.4),
      }}
    >
      <Animated.View style={[{ width: sz, height: sz }, popStyle]}>
        <Image source={img.closed} fadeDuration={0} style={[styles.accImg, { width: sz, height: sz, opacity: open ? 0 : 1 }]} />
        <Image source={img.open} fadeDuration={0} style={[styles.accImg, { width: sz, height: sz, opacity: open ? 1 : 0 }]} />
      </Animated.View>
      {bubbles.map((b, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[styles.reactBubble, { left: sz * (0.38 + i * 0.12), top: 14 }, b]}
        />
      ))}
    </Pressable>
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
  selectedId = null,
  accessories = [],
  feedRequest = null,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [focused, setFocused] = useState(true);

  const selectedAq = useGameStore((s) => s.selectedAquariumBackground);
  const ownedDecor = useGameStore((s) => s.ownedDecor);
  const aqId = resolveAquariumBackgroundId(selectedAq, DECOR, ownedDecor);
  const { source: BG, sandTop } = getAquariumBackground(aqId);
  const natural = useMemo(() => {
    const r = Image.resolveAssetSource(BG);
    return { w: r?.width || FALLBACK_BG_W, h: r?.height || FALLBACK_BG_H };
  }, [BG]);

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
    const scale = Math.max(size.w / natural.w, size.h / natural.h);
    const width = natural.w * scale;
    const imgH = natural.h * scale;
    return {
      width,
      height: imgH,
      left: (size.w - width) / 2,
      floorY: Math.max(0, size.h - imgH * (1 - sandTop)),
    };
  }, [size, natural, sandTop]);

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

          {accessories.map((accId) => {
            const def = DECOR.find((d) => d.id === accId && d.kind === 'accessory');
            return def?.slot ? (
              <Accessory key={accId} id={accId} slot={def.slot} areaW={size.w} floorY={bg.floorY} />
            ) : null;
          })}

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
              selected={selectedId === s.id}
              feedN={feedRequest?.id === s.id ? feedRequest.n : 0}
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
  accImg: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ACC_W,
    height: ACC_W,
  },
  reactBubble: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  grain: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffcc80',
    opacity: 0,
  },
  loveHeart: {
    position: 'absolute',
    top: -20,
    left: FISH_SIZE * 0.42,
    fontSize: 16,
    color: '#ff6f91',
    opacity: 0,
  },
  heart: {
    position: 'absolute',
    top: -4,
    fontSize: 15,
    color: '#ff6f91',
    opacity: 0,
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