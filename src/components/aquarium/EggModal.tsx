import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { FishSprite } from '@/components/puzzle/FishSprite';
import type { EggResult } from '@/game/eggs';
import type { EggKind } from '@/game/types';

const STAGE = 260;
const EGG_W = 120;
const EGG_H = 150;
const FISH_WIDTH = 150;

const TEXT = {
  cracking: 'Yumurta çatlıyor...',
  tapToSkip: 'Atlamak için dokun',
  isNew: 'YENİ!',
  duplicate: 'Zaten koleksiyonunda',
  pearls: 'inci',
  great: 'Harika!',
  another: 'Bir tane daha aç',
};

const RARITY_COLOR: Record<string, string> = {
  common: '#90a4ae',
  uncommon: '#66bb6a',
  rare: '#42a5f5',
  epic: '#ab47bc',
  legendary: '#ffca28',
};

const RARITY_LABEL: Record<string, string> = {
  common: 'Yaygın',
  uncommon: 'Seyrek',
  rare: 'Nadir',
  epic: 'Epik',
  legendary: 'Efsanevi',
};

const EGG_LOOK: Record<EggKind, { body: string; spots: string; outline: string }> = {
  normal: { body: '#f3e3c3', spots: '#d9b98a', outline: '#8a6d3b' },
  rare: { body: '#c9a8ff', spots: '#8e5be8', outline: '#4b2a8a' },
};

const EGG_PATH =
  'M60 6 C92 6 112 58 112 94 C112 126 90 146 60 146 C30 146 8 126 8 94 C8 58 28 6 60 6 Z';
const CRACK_PATH = 'M60 8 L52 34 L68 52 L50 76 L70 98 L56 124';

type ParticleProps = {
  angle: number;
  dist: number;
  size: number;
  color: string;
  delay: number;
};

const Particle = memo(function Particle({ angle, dist, size, color, delay }: ParticleProps) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(p);
  }, [delay, p]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: Math.cos(angle) * dist * p.value },
      { translateY: Math.sin(angle) * dist * p.value },
      { scale: 1 - 0.5 * p.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: STAGE / 2 - size / 2,
          top: STAGE / 2 - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
});

type Props = {
  visible: boolean;
  kind: EggKind;
  // Parent openEgg(kind) çağırır ve sonucu buraya verir. Kapatınca null yapın.
  result: EggResult | null;
  eggsLeft?: number;
  onClose: () => void;
  // Verilirse ve eggsLeft > 0 ise "Bir tane daha aç" butonu görünür.
  onOpenAnother?: () => void;
};

function EggModalBase({ visible, kind, result, eggsLeft = 0, onClose, onOpenAnother }: Props) {
  const [revealedFor, setRevealedFor] = useState<EggResult | null>(null);
  const doneRef = useRef(false);

  const wobble = useSharedValue(0);
  const eggScale = useSharedValue(1);
  const crack = useSharedValue(0);
  const flash = useSharedValue(0);
  const reveal = useSharedValue(0);
  const glow = useSharedValue(1);

  const phase: 'egg' | 'reveal' = result && revealedFor === result ? 'reveal' : 'egg';

  const startReveal = useCallback(() => {
    if (doneRef.current || !result) return;
    doneRef.current = true;
    cancelAnimation(wobble);
    wobble.value = withTiming(0, { duration: 60 });
    setRevealedFor(result);
    flash.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(0, { duration: 420 })
    );
    reveal.value = withSpring(1, { damping: 9, stiffness: 140 });
    glow.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 900 }), withTiming(0.95, { duration: 900 })),
      -1,
      false
    );
  }, [result, wobble, flash, reveal, glow]);

  useLayoutEffect(() => {
    if (!visible || !result) return;

    doneRef.current = false;
    wobble.value = 0;
    eggScale.value = 1;
    crack.value = 0;
    flash.value = 0;
    reveal.value = 0;
    glow.value = 1;

    eggScale.value = withDelay(350, withTiming(1.08, { duration: 700 }));
    crack.value = withDelay(350, withTiming(1, { duration: 700 }));
    wobble.value = withDelay(
      350,
      withSequence(
        withTiming(-6, { duration: 110 }),
        withTiming(6, { duration: 130 }),
        withTiming(-10, { duration: 120 }),
        withTiming(10, { duration: 120 }),
        withTiming(-14, { duration: 110 }),
        withTiming(14, { duration: 110 }),
        withTiming(0, { duration: 90 }, (finished) => {
          if (finished) runOnJS(startReveal)();
        })
      )
    );

    return () => {
      cancelAnimation(wobble);
      cancelAnimation(eggScale);
      cancelAnimation(crack);
      cancelAnimation(flash);
      cancelAnimation(reveal);
      cancelAnimation(glow);
    };
  }, [visible, result, startReveal, wobble, eggScale, crack, flash, reveal, glow]);

  const eggStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value}deg` }, { scale: eggScale.value }],
  }));
  const crackStyle = useAnimatedStyle(() => ({ opacity: crack.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const fishStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ scale: 0.3 + 0.7 * reveal.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, reveal.value) * 0.45,
    transform: [{ scale: glow.value }],
  }));
  const infoStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, reveal.value) }));

  const rarityColor = result ? (RARITY_COLOR[result.fish.rarity] ?? '#90a4ae') : '#90a4ae';
  const rarityLabel = result
    ? (RARITY_LABEL[result.fish.rarity] ?? String(result.fish.rarity).toUpperCase())
    : '';

  const particles = useMemo(() => {
    if (!result) return [];
    const r = result.fish.rarity;
    const count = r === 'legendary' ? 20 : r === 'epic' ? 16 : 10;
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2 + (i % 2) * 0.2,
      dist: 90 + (i % 3) * 25,
      size: 6 + (i % 3) * 2,
      delay: (i % 4) * 30,
    }));
  }, [result]);

  const look = EGG_LOOK[kind] ?? EGG_LOOK.normal;
  const canOpenAnother = !!onOpenAnother && eggsLeft > 0;

  return (
    <Modal
      visible={visible && !!result}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={phase === 'egg' ? startReveal : undefined}
        disabled={phase !== 'egg'}
      >
        <View style={styles.stage}>
          {phase === 'egg' && (
            <Animated.View style={[styles.egg, eggStyle]}>
              <Svg width={EGG_W} height={EGG_H} viewBox={`0 0 ${EGG_W} ${EGG_H}`}>
                <Path d={EGG_PATH} fill={look.body} stroke={look.outline} strokeWidth={3} />
                <Circle cx={42} cy={58} r={7} fill={look.spots} />
                <Circle cx={78} cy={44} r={5} fill={look.spots} />
                <Circle cx={82} cy={92} r={8} fill={look.spots} />
                <Circle cx={40} cy={112} r={6} fill={look.spots} />
                <Ellipse cx={42} cy={36} rx={9} ry={14} fill="#ffffff" opacity={0.3} />
              </Svg>
              <Animated.View pointerEvents="none" style={[styles.crackLayer, crackStyle]}>
                <Svg width={EGG_W} height={EGG_H} viewBox={`0 0 ${EGG_W} ${EGG_H}`}>
                  <Path
                    d={CRACK_PATH}
                    stroke="#3a2a1a"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Animated.View>
            </Animated.View>
          )}

          {phase === 'reveal' && result && (
            <>
              <Animated.View
                pointerEvents="none"
                style={[styles.glow, { backgroundColor: rarityColor }, glowStyle]}
              />
              {particles.map((p, i) => (
                <Particle
                  key={`${i}-${result.fish.id}`}
                  angle={p.angle}
                  dist={p.dist}
                  size={p.size}
                  delay={p.delay}
                  color={rarityColor}
                />
              ))}
              <Animated.View style={fishStyle}>
                <FishSprite id={result.fish.id} width={FISH_WIDTH} />
              </Animated.View>
            </>
          )}
        </View>

        {phase === 'egg' ? (
          <View style={styles.info}>
            <Text style={styles.hint}>{TEXT.cracking}</Text>
            <Text style={styles.subHint}>{TEXT.tapToSkip}</Text>
          </View>
        ) : (
          result && (
            <Animated.View style={[styles.info, infoStyle]}>
              {result.isNew ? (
                <View style={[styles.badge, { backgroundColor: '#ffeb3b' }]}>
                  <Text style={[styles.badgeText, { color: '#3e2f00' }]}>{TEXT.isNew}</Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                  <Text style={[styles.badgeText, { color: '#ffffff' }]}>
                    {TEXT.duplicate} · +{result.duplicatePearls} {TEXT.pearls}
                  </Text>
                </View>
              )}

              <Text style={styles.name}>{result.fish.name}</Text>
              <Text style={[styles.rarity, { color: rarityColor }]}>{rarityLabel}</Text>

              <View style={styles.buttons}>
                {canOpenAnother && (
                  <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onOpenAnother}>
                    <Text style={styles.btnText}>
                      {TEXT.another} ({eggsLeft})
                    </Text>
                  </Pressable>
                )}
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onClose}>
                  <Text style={[styles.btnText, { color: '#06283d' }]}>{TEXT.great}</Text>
                </Pressable>
              </View>
            </Animated.View>
          )
        )}

        <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
      </Pressable>
    </Modal>
  );
}

export const EggModal = memo(EggModalBase);
export default EggModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8,24,48,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  egg: {
    width: EGG_W,
    height: EGG_H,
  },
  glow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  particle: {
    position: 'absolute',
  },
  info: {
    alignItems: 'center',
    marginTop: 12,
    minHeight: 150,
  },
  hint: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  subHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  name: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  rarity: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  buttons: {
    marginTop: 22,
    gap: 10,
    alignSelf: 'stretch',
    minWidth: 240,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#80cbc4',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
  crackLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});