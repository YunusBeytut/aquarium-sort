import * as Haptics from 'expo-haptics';
import { useEffect, useReducer, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { SoundManager } from '@/audio/SoundManager';
import { EggArt, PearlIcon } from '@/components/aquarium/EggArt';
import { StarIcon } from '@/components/puzzle/FishSprite';
import { DAILY_CYCLE, DAILY_REWARDS, getDailyView, type DailyReward } from '@/game/daily';
import { useGameStore } from '@/store/gameStore';

const COLORS = {
  gold: '#ffd54f',
  goldEdge: '#c99a14',
  goldText: '#4a3500',
  panel: 'rgba(6,28,58,0.62)',
  panelBorder: 'rgba(255,255,255,0.16)',
  soft: '#b0c8d8',
};

// Uygulama arka plandan dönünce (gün değişmiş olabilir) bileşeni yeniden çizer.
function useDayTick() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') bump();
    });
    return () => sub.remove();
  }, []);
}

// ---------------------------------------------------------------------------
// Çizimler
// ---------------------------------------------------------------------------

// Takvim ve üstünde alev: günlük seri simgesi.
function ShellIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x="4" y="7" width="32" height="29" rx="6" fill="#fff8e1" stroke={COLORS.goldEdge} strokeWidth={2} />
      <Path
        d="M4 16v-3a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v3z"
        fill={COLORS.gold}
        stroke={COLORS.goldEdge}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Rect x="11" y="3" width="3.5" height="8" rx="1.75" fill={COLORS.goldEdge} />
      <Rect x="25.5" y="3" width="3.5" height="8" rx="1.75" fill={COLORS.goldEdge} />
      <Path
        d="M20 18c1 3 5 5 5 9.5a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1.5 1 2.5 2 2.5-1-3 0-5 1-8z"
        fill="#ff7043"
        stroke="#d84315"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path d="M20 26c.8 1.5 2.2 2.3 2.2 4a2.2 2.2 0 0 1-4.4 0c0-1.5 1.4-2.3 2.2-4z" fill={COLORS.gold} />
    </Svg>
  );
}

function FoodTinSmall({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="14" y="15" width="36" height="42" rx="8" fill="#ff9e57" stroke="#c9692a" strokeWidth={2.5} />
      <Rect x="10" y="6" width="44" height="12" rx="5" fill="#ffd54f" stroke="#c99a14" strokeWidth={2.5} />
      <Rect x="21" y="27" width="22" height="17" rx="6" fill="#fff3e0" />
      <Circle cx="27" cy="36" r="2.4" fill="#ffb74d" />
      <Circle cx="33" cy="33" r="2.4" fill="#ff8a65" />
      <Circle cx="38" cy="38" r="2.4" fill="#ffb74d" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Ana ekrandaki baloncuk düğmesi
// ---------------------------------------------------------------------------

const BUBBLE = 64;

export function DailyStreakButton({ onPress }: { onPress: () => void }) {
  useDayTick();
  const { t } = useTranslation();
  const daily = useGameStore((s) => s.daily);
  const view = getDailyView(daily);
  const canClaim = !view.claimedToday;

  const float = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    return () => cancelAnimation(float);
  }, [float]);

  useEffect(() => {
    if (!canClaim) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1
    );
    return () => cancelAnimation(pulse);
  }, [canClaim, pulse]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.4 }],
  }));

  return (
    <Animated.View style={floatStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('daily.title', { defaultValue: 'Daily Streak' })}
        style={({ pressed }) => [styles.bubbleWrap, pressed && styles.bubblePressed]}
      >
        {canClaim && <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />}
        <View style={styles.bubble}>
          <View style={styles.highlight} />
          <ShellIcon size={38} />
        </View>

        {canClaim && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>!</Text>
          </View>
        )}
        {view.streak > 0 && (
          <View pointerEvents="none" style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{view.streak}</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

type Chip = { key: string; icon: ReactNode; text: string; sub?: string };

function chipsOf(r: DailyReward, helperName: (kind: string) => string): Chip[] {
  const out: Chip[] = [];
  if (r.egg) out.push({ key: 'egg', icon: <EggArt kind={r.egg} size={36} />, text: '×1' });
  if (r.booster) {
    out.push({
      key: 'boost',
      icon: <StarIcon size={26} />,
      text: `×${r.booster.n}`,
      sub: helperName(r.booster.kind),
    });
  }
  if (r.food) out.push({ key: 'food', icon: <FoodTinSmall size={28} />, text: `×${r.food}` });
  if (r.pearls) out.push({ key: 'pearls', icon: <PearlIcon size={26} />, text: `+${r.pearls}` });
  return out;
}

type TileState = 'done' | 'today' | 'locked';

function DayTile({
  label,
  chips,
  state,
  big,
}: {
  label: string;
  chips: Chip[];
  state: TileState;
  big?: boolean;
}) {
  return (
    <View
      style={[
        styles.tile,
        big && styles.tileBig,
        state === 'today' && styles.tileToday,
        state === 'done' && styles.tileDone,
      ]}
    >
      <Text style={[styles.tileLabel, state === 'today' && styles.tileLabelToday]}>{label}</Text>
      <View style={[styles.chips, big && styles.chipsRow]}>
        {chips.map((c) => (
          <View key={c.key} style={styles.chip}>
            {c.icon}
            <Text style={styles.chipText}>{c.text}</Text>
            {c.sub ? <Text style={styles.chipSub}>{c.sub}</Text> : null}
          </View>
        ))}
      </View>
      {state === 'done' && (
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
    </View>
  );
}

export function DailyStreakModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  useDayTick();
  const { t } = useTranslation();
  const daily = useGameStore((s) => s.daily);
  const claimDaily = useGameStore((s) => s.claimDaily);
  const hapticsEnabled = useGameStore((s) => s.settings.haptics);
  const view = getDailyView(daily);

  const helperName = (kind: string) => t(`play.helpers.${kind}`);

  const claim = () => {
    const reward = claimDaily();
    if (!reward) return;
    SoundManager.play('helperUse');
    if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const stateOf = (i: number): TileState => {
    if (i < view.pos) return 'done';
    if (i === view.pos) return view.claimedToday ? 'done' : 'today';
    return 'locked';
  };

  const small = DAILY_REWARDS.slice(0, DAILY_CYCLE - 1);
  const lastIndex = DAILY_CYCLE - 1;
  const dayLabel = (i: number) => t('daily.day', { n: i + 1, defaultValue: `Day ${i + 1}` });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="close" />

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerBubble}>
              <ShellIcon size={34} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('daily.title', { defaultValue: 'Daily Streak' })}</Text>
              <Text style={styles.subtitle}>
                {view.streak > 0
                  ? t('daily.streak', { n: view.streak, defaultValue: `${view.streak} day streak` })
                  : t('daily.start', { defaultValue: 'Start your streak!' })}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('daily.close', { defaultValue: 'Close' })}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {small.map((r, i) => (
              <DayTile
                key={i}
                label={dayLabel(i)}
                chips={chipsOf(r, helperName)}
                state={stateOf(i)}
              />
            ))}
            <DayTile
              label={dayLabel(lastIndex)}
              chips={chipsOf(DAILY_REWARDS[lastIndex], helperName)}
              state={stateOf(lastIndex)}
              big
            />
          </View>

          <Pressable
            disabled={view.claimedToday}
            onPress={claim}
            accessibilityRole="button"
            accessibilityState={{ disabled: view.claimedToday }}
            style={({ pressed }) => [
              styles.btn,
              view.claimedToday && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={[styles.btnText, view.claimedToday && styles.btnTextDisabled]}>
              {view.claimedToday
                ? t('daily.claimed', { defaultValue: 'Come back tomorrow' })
                : t('daily.claim', { defaultValue: 'Claim' })}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Düğme
  bubbleWrap: {
    width: BUBBLE,
    height: BUBBLE + 8,
    alignItems: 'center',
  },
  bubblePressed: {
    transform: [{ scale: 0.94 }],
  },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: 'rgba(120,200,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    top: 9,
    left: 12,
    width: 16,
    height: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.65)',
    transform: [{ rotate: '-25deg' }],
  },
  ring: {
    position: 'absolute',
    top: 0,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.gold,
    borderWidth: 2,
    borderColor: '#0b3d5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.goldText,
  },
  pillRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(6,28,58,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.gold,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,14,34,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#0f3a6b',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(120,200,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
  },
  close: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.soft,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '31.6%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.panel,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tileBig: {
    width: '100%',
    minHeight: 84,
  },
  tileToday: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,213,79,0.16)',
  },
  tileDone: {
    opacity: 0.55,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.soft,
  },
  tileLabelToday: {
    color: COLORS.gold,
  },
  chips: {
    alignItems: 'center',
    gap: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 22,
  },
  chip: {
    alignItems: 'center',
    gap: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  chipSub: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.soft,
  },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#66bb6a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 16,
    borderBottomWidth: 4,
    backgroundColor: COLORS.gold,
    borderBottomColor: COLORS.goldEdge,
  },
  btnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  btnPressed: {
    transform: [{ translateY: 3 }],
    opacity: 0.92,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.goldText,
  },
  btnTextDisabled: {
    color: 'rgba(255,255,255,0.42)',
  },
});