import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

// ---------------------------------------------------------------------------
// İkonlar
// ---------------------------------------------------------------------------

const ICON_COLOR = '#06304d';

function Icon({ d, size = 26 }: { d: string[]; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {d.map((p, i) => (
        <Path
          key={i}
          d={p}
          stroke={ICON_COLOR}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

const ICONS = {
  undo: ['M9 14 L4 9 L9 4', 'M4 9 H15 A6 6 0 0 1 15 21 H11'],
  jar: ['M12 5 V19', 'M5 12 H19'],
  hint: [
    'M9 18 H15',
    'M10 21 H14',
    'M12 3 A6 6 0 0 0 8 13.5 C8.8 14.3 9 15 9 16 H15 C15 15 15.2 14.3 16 13.5 A6 6 0 0 0 12 3 Z',
  ],
  restart: ['M20 12 A8 8 0 1 1 17.7 6.3', 'M20 4 V9 H15'],
};

// ---------------------------------------------------------------------------
// Buton
// ---------------------------------------------------------------------------

const FACE_H = 58;
const LIP = 6;

type ButtonProps = {
  label: string;
  icon: string[];
  face: string;
  lip: string;
  edge: string;
  badge?: number;
  disabled?: boolean;
  onPress: () => void;
};

const HelperButton = memo(function HelperButton({
  label,
  icon,
  face,
  lip,
  edge,
  badge,
  disabled,
  onPress,
}: ButtonProps) {
  const pressed = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * (LIP - 2) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 12, stiffness: 300 });
      }}
      accessibilityRole="button"
      accessibilityLabel={badge !== undefined ? `${label}, ${badge}` : label}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.slot, disabled && styles.disabled]}
    >
      <View style={[styles.lip, { backgroundColor: lip }]} />
      <Animated.View style={[styles.face, { backgroundColor: face, borderColor: edge }, faceStyle]}>
        <Icon d={icon} />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------

type Props = {
  undoLeft: number;
  extraJarLeft: number;
  canUndo: boolean;
  onUndo: () => void;
  onExtraJar: () => void;
  onHint: () => void;
  onRestart: () => void;
  // i18n'den verilebilir. Verilmezse Türkçe varsayılanlar kullanılır.
  labels?: { undo?: string; extraJar?: string; hint?: string; restart?: string };
};

export function HelperBar({
  undoLeft,
  extraJarLeft,
  canUndo,
  onUndo,
  onExtraJar,
  onHint,
  onRestart,
  labels,
}: Props) {
  return (
    <View style={styles.bar}>
      <HelperButton
        label={labels?.undo ?? 'Geri al'}
        icon={ICONS.undo}
        face="#58c8f2"
        lip="#2584b0"
        edge="#9be3fb"
        badge={undoLeft}
        disabled={undoLeft <= 0 || !canUndo}
        onPress={onUndo}
      />
      <HelperButton
        label={labels?.extraJar ?? 'Kavanoz'}
        icon={ICONS.jar}
        face="#5fd6a8"
        lip="#2a9a72"
        edge="#a2ecd0"
        badge={extraJarLeft}
        disabled={extraJarLeft <= 0}
        onPress={onExtraJar}
      />
      <HelperButton
        label={labels?.hint ?? 'İpucu'}
        icon={ICONS.hint}
        face="#ffd54f"
        lip="#c99a14"
        edge="#ffe69a"
        onPress={onHint}
      />
      <HelperButton
        label={labels?.restart ?? 'Yeniden'}
        icon={ICONS.restart}
        face="#9fb8d8"
        lip="#5d7ba3"
        edge="#c7d8ee"
        onPress={onRestart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  slot: {
    flex: 1,
    maxWidth: 88,
    height: FACE_H + LIP,
  },
  disabled: {
    opacity: 0.4,
  },
  lip: {
    position: 'absolute',
    top: LIP,
    left: 0,
    right: 0,
    height: FACE_H,
    borderRadius: 18,
  },
  face: {
    height: FACE_H,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: ICON_COLOR,
  },
  badge: {
    position: 'absolute',
    top: -9,
    right: -7,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: '#06304d',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});