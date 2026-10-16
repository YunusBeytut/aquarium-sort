import { memo, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

// ---------------------------------------------------------------------------
// İkonlar (kodla çizilir, görsel dosyası gerekmez)
// ---------------------------------------------------------------------------

function PearlIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Defs>
        <RadialGradient id="hudPearl" cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.6" stopColor="#f6d9e8" />
          <Stop offset="1" stopColor="#d9a9c6" />
        </RadialGradient>
      </Defs>
      <Circle cx={14} cy={14} r={11} fill="url(#hudPearl)" stroke="#b97fa3" strokeWidth={1.2} />
      <Ellipse cx={10.5} cy={9.5} rx={3.2} ry={2} fill="#ffffff" opacity={0.85} />
    </Svg>
  );
}

function SparkleIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path
        d="M14 2.5 L16.9 11.1 L25.5 14 L16.9 16.9 L14 25.5 L11.1 16.9 L2.5 14 L11.1 11.1 Z"
        fill="#ffd54f"
        stroke="#c98f00"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Circle cx={22.5} cy={5.5} r={2} fill="#fff3b0" />
    </Svg>
  );
}

function FishIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path d="M9 14 L2.5 8 Q4.8 14 2.5 20 Z" fill="#1f9e92" stroke="#0f6a62" strokeWidth={1} strokeLinejoin="round" />
      <Ellipse cx={16} cy={14} rx={9.5} ry={6.8} fill="#4dd0c4" stroke="#0f6a62" strokeWidth={1.2} />
      <Ellipse cx={15} cy={11} rx={4.5} ry={1.6} fill="#ffffff" opacity={0.3} />
      <Circle cx={21} cy={12.5} r={2} fill="#ffffff" />
      <Circle cx={21.5} cy={12.5} r={1} fill="#1b1b2f" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Gösterge hapı
// ---------------------------------------------------------------------------

type StatPillProps = {
  icon: ReactNode;
  value: string;
  accessibilityLabel?: string;
};

// Değer değişince küçük bir "pop" animasyonu oynar (ilk açılışta oynamaz).
const StatPill = memo(function StatPill({ icon, value, accessibilityLabel }: StatPillProps) {
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.value = withSequence(withTiming(1.14, { duration: 90 }), withSpring(1, { damping: 8 }));
  }, [value, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[styles.pill, style]}
      accessible
      accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}: ${value}` : value}
    >
      <View style={styles.pillIcon}>{icon}</View>
      <Text style={styles.pillText} numberOfLines={1}>
        {value}
      </Text>
    </Animated.View>
  );
});

function formatCompact(n: number): string {
  if (n < 10000) return String(n);
  if (n < 1000000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

type TopBarProps = {
  pearls: number;
  bonusPct: number;
  fishOwned: number;
  fishTotal: number;
  // Erişilebilirlik için isteğe bağlı etiketler (i18n'den ver).
  labels?: { pearls?: string; bonus?: string; fish?: string };
};

export function TopBar({ pearls, bonusPct, fishOwned, fishTotal, labels }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <StatPill
        icon={<PearlIcon />}
        value={formatCompact(pearls)}
        accessibilityLabel={labels?.pearls}
      />
      <StatPill
        icon={<SparkleIcon />}
        value={`+${bonusPct}%`}
        accessibilityLabel={labels?.bonus}
      />
      <StatPill
        icon={<FishIcon />}
        value={`${fishOwned}/${fishTotal}`}
        accessibilityLabel={labels?.fish}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Oyna butonu (3D, basılınca çöker, boştayken hafif nabız atar)
// ---------------------------------------------------------------------------

const FACE_H = 66;
const LIP = 8;

type PlayButtonProps = {
  title: string; // "Oyna"
  subtitle?: string; // "Level 12"
  onPress: () => void;
  disabled?: boolean;
};

export function PlayButton({ title, subtitle, onPress, disabled = false }: PlayButtonProps) {
  const pulse = useSharedValue(1);
  const pressed = useSharedValue(0);

  useEffect(() => {
    if (disabled) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [disabled, pulse]);

  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * (LIP - 2) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 70 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 12, stiffness: 300 });
      }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={styles.playPressable}
    >
      <Animated.View style={[styles.playWrap, wrapStyle, disabled && styles.playDisabled]}>
        <View style={styles.playLip} />
        <Animated.View style={[styles.playFace, faceStyle]}>
          <View pointerEvents="none" style={styles.playShine} />
          <Text style={styles.playTitle} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 21,
    backgroundColor: 'rgba(6,28,58,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 7,
  },
  pillIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  playPressable: {
    width: '100%',
    alignItems: 'center',
  },
  playWrap: {
    width: '100%',
    maxWidth: 340,
    height: FACE_H + LIP,
  },
  playDisabled: {
    opacity: 0.5,
  },
  playLip: {
    position: 'absolute',
    top: LIP,
    left: 0,
    right: 0,
    height: FACE_H,
    borderRadius: 24,
    backgroundColor: '#c0402a',
  },
  playFace: {
    height: FACE_H,
    borderRadius: 24,
    backgroundColor: '#ff7a59',
    borderWidth: 2,
    borderColor: '#ffa98f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  playShine: {
    position: 'absolute',
    top: 5,
    left: 20,
    right: 20,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  playTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(120,30,10,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(120,30,10,0.28)',
  },
  levelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});