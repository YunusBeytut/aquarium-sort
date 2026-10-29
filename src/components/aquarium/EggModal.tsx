import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import Svg, { Path } from 'react-native-svg';

import { SoundManager } from '@/audio/SoundManager';
import { FishSprite } from '@/components/puzzle/FishSprite';
import type { EggResult } from '@/game/eggs';
import type { EggKind, Rarity } from '@/game/types';
import { useGameStore } from '@/store/gameStore';

import {
  EGG_ASPECT,
  EGG_CRACK_PATH,
  EGG_VIEW_H,
  EGG_VIEW_W,
  EggArt,
  PearlIcon,
} from './EggArt';

const STAGE = 250;
const EGG_SIZE = 160; // yumurta yüksekliği
const EGG_W = EGG_SIZE * EGG_ASPECT;
const FISH_WIDTH = 150;

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b0bec5',
  rare: '#4fc3f7',
  epic: '#ba68c8',
  legendary: '#ffd54f',
};

const GOLD = '#ffd54f';
const GOLD_EDGE = '#c99a14';
const GOLD_TEXT = '#4a3500';
const AQUA = '#4fc3f7';
const AQUA_EDGE = '#1f8fc0';
const AQUA_TEXT = '#06263d';

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

function ModalButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: 'gold' | 'aqua';
  onPress: () => void;
}) {
  const palette =
    tone === 'gold'
      ? { face: GOLD, edge: GOLD_EDGE, text: GOLD_TEXT }
      : { face: AQUA, edge: AQUA_EDGE, text: AQUA_TEXT };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.face, borderBottomColor: palette.edge },
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

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
  const { t } = useTranslation();
  const [revealedFor, setRevealedFor] = useState<EggResult | null>(null);
  const doneRef = useRef(false);

  const wobble = useSharedValue(0);
  const eggScale = useSharedValue(1);
  const crack = useSharedValue(0);
  const flash = useSharedValue(0);
  const reveal = useSharedValue(0);
  const glow = useSharedValue(1);

  const phase: 'egg' | 'reveal' = result && revealedFor === result ? 'reveal' : 'egg';

  // Balık ortaya çıkarken ses ve titreşim: yeni ya da epik/efsanevi balık kutlanır, tekrar edeni hafif geçilir.
  const celebrate = useCallback((r: EggResult) => {
    const high = r.fish.rarity === 'epic' || r.fish.rarity === 'legendary';
    if (useGameStore.getState().settings.haptics) {
      if (r.isNew || high) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (high) SoundManager.play('levelComplete');
    else if (r.isNew) SoundManager.play('jarComplete');
  }, []);

  const startReveal = useCallback(() => {
    if (doneRef.current || !result) return;
    doneRef.current = true;
    cancelAnimation(wobble);
    wobble.value = withTiming(0, { duration: 60 });
    setRevealedFor(result);
    celebrate(result);
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
  }, [result, celebrate, wobble, flash, reveal, glow]);

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

  const rarityColor = result ? RARITY_COLOR[result.fish.rarity] : RARITY_COLOR.common;
  const rarityLabel = result ? t(`rarity.${result.fish.rarity}`) : '';

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
              <EggArt kind={kind} size={EGG_SIZE} />
              <Animated.View pointerEvents="none" style={[styles.crackLayer, crackStyle]}>
                <Svg
                  width={EGG_W}
                  height={EGG_SIZE}
                  viewBox={`0 0 ${EGG_VIEW_W} ${EGG_VIEW_H}`}
                >
                  <Path
                    d={EGG_CRACK_PATH}
                    stroke="#3a2a1a"
                    strokeWidth={2.2}
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
          <View style={styles.waiting}>
            <Text style={styles.hint}>{t('eggModal.cracking')}</Text>
            <Text style={styles.subHint}>{t('eggModal.tapToSkip')}</Text>
          </View>
        ) : (
          result && (
            <Animated.View
              style={[styles.card, { borderColor: `${rarityColor}aa` }, infoStyle]}
            >
              {result.isNew ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{t('eggModal.isNew')}</Text>
                </View>
              ) : (
                <View style={styles.dupBadge}>
                  <Text style={styles.dupText}>{t('eggModal.duplicate')}</Text>
                  <View style={styles.dupPearls}>
                    <Text style={styles.dupText}>+{result.duplicatePearls}</Text>
                    <PearlIcon size={15} />
                  </View>
                </View>
              )}

              <Text style={styles.name}>{result.fish.name}</Text>

              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.rarityChip,
                    { borderColor: rarityColor, backgroundColor: `${rarityColor}2e` },
                  ]}
                >
                  <Text style={[styles.rarityText, { color: rarityColor }]}>{rarityLabel}</Text>
                </View>
                {result.isNew && (
                  <Text style={styles.bonusText}>
                    {t('common.plusPercent', { pct: result.fish.bonusPct })} {t('eggModal.bonus')}
                  </Text>
                )}
              </View>

              <View style={styles.buttons}>
                {canOpenAnother && (
                  <ModalButton
                    label={`${t('eggModal.another')} (${eggsLeft})`}
                    tone="aqua"
                    onPress={onOpenAnother}
                  />
                )}
                <ModalButton label={t('eggModal.great')} tone="gold" onPress={onClose} />
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
    backgroundColor: 'rgba(6,28,58,0.95)',
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
    height: EGG_SIZE,
  },
  crackLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },

  waiting: {
    alignItems: 'center',
    marginTop: 12,
    minHeight: 150,
  },
  hint: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  subHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginTop: 6,
  },

  card: {
    alignSelf: 'stretch',
    maxWidth: 360,
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(6,28,58,0.7)',
    borderWidth: 1.5,
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  newBadge: {
    backgroundColor: GOLD,
    borderBottomWidth: 3,
    borderBottomColor: GOLD_EDGE,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  newBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: GOLD_TEXT,
  },
  dupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dupText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  dupPearls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rarityChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  rarityText: {
    fontSize: 13,
    fontWeight: '800',
  },
  bonusText: {
    fontSize: 14,
    fontWeight: '900',
    color: GOLD,
  },
  buttons: {
    alignSelf: 'stretch',
    marginTop: 8,
    gap: 10,
  },
  btn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderBottomWidth: 4,
    paddingHorizontal: 14,
  },
  btnPressed: {
    transform: [{ translateY: 3 }],
    opacity: 0.92,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
  },
});