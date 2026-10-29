import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { SoundManager } from '@/audio/SoundManager';
import { EggArt, PearlIcon } from '@/components/aquarium/EggArt';
import { EggModal } from '@/components/aquarium/EggModal';
import { IapSection } from '@/components/shop/IapSection';
import { FishSprite } from '@/components/puzzle/FishSprite';
import { PuzzleBackground } from '@/components/puzzle/PuzzleBackground';
import { DECOR, getUnlockedFish } from '@/data';
import { ACCESSORY_IMAGES, getBackgroundImage } from '@/data/decorImages';
import { DEFAULT_BACKGROUND_ID, isDecorUnlocked, resolveBackgroundId } from '@/game/decor';
import { FOOD_PACK, SHOP_FISH_PRICE, eggPrice } from '@/game/economy';
import type { EggResult } from '@/game/eggs';
import type { EggKind } from '@/game/types';
import { useGameStore } from '@/store/gameStore';

const COLORS = {
  gold: '#ffd54f',
  goldEdge: '#c99a14',
  goldText: '#4a3500',
  aqua: '#4fc3f7',
  aquaEdge: '#1f8fc0',
  aquaText: '#06263d',
  amethyst: '#ba68c8',
  panel: 'rgba(6,28,58,0.62)',
  panelBorder: 'rgba(255,255,255,0.16)',
  soft: '#b0c8d8',
};

// ---------------------------------------------------------------------------
// Küçük çizimler (yumurta ve inci çizimleri components/aquarium/EggArt.tsx içinde)
// ---------------------------------------------------------------------------

function LockIcon({ size = 16, color = '#90a4ae' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M6 9V6.5a4 4 0 0 1 8 0V9"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Rect x="3.5" y="9" width="13" height="9" rx="2.5" fill={color} />
    </Svg>
  );
}

// Değer değişince kısa bir "pop" animasyonu verir (ilk çizimde oynamaz).
function usePop(value: number) {
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.value = withSequence(
      withTiming(1.18, { duration: 100 }),
      withSpring(1, { damping: 8, stiffness: 220 })
    );
  }, [value, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

// ---------------------------------------------------------------------------
// Yumurta tezgâhı
// ---------------------------------------------------------------------------

const EGG_SIZE = 104;

function FloatingEgg({ kind, count }: { kind: EggKind; count: number }) {
  const rare = kind === 'rare';
  const float = useSharedValue(0);
  const tilt = useSharedValue(0);
  const glow = useSharedValue(0.35);
  const badgePop = usePop(count);

  useEffect(() => {
    const half = rare ? 1300 : 1700;
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: half, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: half, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    tilt.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 1900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    if (rare) {
      glow.value = withRepeat(
        withSequence(withTiming(0.75, { duration: 1100 }), withTiming(0.3, { duration: 1100 })),
        -1
      );
    }
    return () => {
      cancelAnimation(float);
      cancelAnimation(tilt);
      cancelAnimation(glow);
    };
  }, [rare, float, tilt, glow]);

  const eggStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { rotate: `${tilt.value}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={styles.eggStage}>
      {rare && <Animated.View pointerEvents="none" style={[styles.eggGlow, glowStyle]} />}
      <View style={styles.dais} />
      <Animated.View style={eggStyle}>
        <EggArt kind={kind} size={EGG_SIZE} />
      </Animated.View>
      {count > 0 && (
        <Animated.View style={[styles.countBadge, badgePop]}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </Animated.View>
      )}
    </View>
  );
}

type ButtonTone = 'gold' | 'aqua';

function ChunkyButton({
  label,
  price,
  tone,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  price?: number;
  tone: ButtonTone;
  disabled: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const palette = disabled
    ? { face: 'rgba(255,255,255,0.14)', edge: 'rgba(255,255,255,0.07)', text: 'rgba(255,255,255,0.42)' }
    : tone === 'gold'
      ? { face: COLORS.gold, edge: COLORS.goldEdge, text: COLORS.goldText }
      : { face: COLORS.aqua, edge: COLORS.aquaEdge, text: COLORS.aquaText };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.face, borderBottomColor: palette.edge },
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnText, { color: palette.text }]}>{label}</Text>
      {price !== undefined && (
        <View style={styles.priceRow}>
          <View style={disabled && styles.dimmed}>
            <PearlIcon size={16} />
          </View>
          <Text style={[styles.btnText, { color: palette.text }]}>{price}</Text>
        </View>
      )}
    </Pressable>
  );
}

function EggStall({
  kind,
  count,
  pearls,
  price,
  onOpen,
  onBuy,
}: {
  kind: EggKind;
  count: number;
  pearls: number;
  price: number;
  onOpen: () => void;
  onBuy: () => void;
}) {
  const canBuy = pearls >= price;
  const rare = kind === 'rare';
  const { t } = useTranslation();
  const info = { name: t(`shop.egg.${kind}.name`), sub: t(`shop.egg.${kind}.sub`) };

  return (
    <View style={[styles.stall, rare && styles.stallRare]}>
      <FloatingEgg kind={kind} count={count} />

      <Text style={styles.stallName}>{info.name}</Text>
      <Text style={styles.stallSub}>{info.sub}</Text>

      <View style={styles.stallButtons}>
        <ChunkyButton
          label={t('shop.open')}
          tone="gold"
          disabled={count <= 0}
          onPress={onOpen}
          accessibilityLabel={`${info.name} ${t('shop.open')}. ${t('shop.owned', { n: count })}`}
        />
        <ChunkyButton
          label={t('shop.buy')}
          price={price}
          tone="aqua"
          disabled={!canBuy}
          onPress={onBuy}
          accessibilityLabel={t('shop.a11yBuy', { name: info.name, price: price })}
        />
        <Text style={[styles.missing, canBuy && styles.missingHidden]}>
          {t('shop.missing', { count: Math.max(0, price - pearls) })}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Balık yemi tezgâhı
// ---------------------------------------------------------------------------

function FoodTin({ size = 64 }: { size?: number }) {
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

function FoodStall({
  count,
  pearls,
  onBuy,
}: {
  count: number;
  pearls: number;
  onBuy: () => void;
}) {
  const { t } = useTranslation();
  const canBuy = pearls >= FOOD_PACK.price;
  const stockPop = usePop(count);
  const name = t('shop.food.name', { defaultValue: 'Fish food' });

  return (
    <View style={styles.foodStall}>
      <FoodTin size={64} />

      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{name}</Text>
        <Text style={styles.foodSub}>
          {t('shop.food.sub', { defaultValue: 'Tap a fish, then feed it. They love it!' })}
        </Text>
        <Animated.View style={[styles.foodStock, stockPop]}>
          <Text style={styles.foodStockText}>
            {t('shop.food.stock', { count, defaultValue: 'In stock: {{count}}' })}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.foodBuy}>
        <ChunkyButton
          label={`+${FOOD_PACK.amount}`}
          price={FOOD_PACK.price}
          tone="aqua"
          disabled={!canBuy}
          onPress={onBuy}
          accessibilityLabel={t('shop.a11yBuy', { name, price: FOOD_PACK.price })}
        />
        <Text style={[styles.missing, canBuy && styles.missingHidden]}>
          {t('shop.missing', { count: Math.max(0, FOOD_PACK.price - pearls) })}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Özel canlı kartı (yalnızca mağazada satılan)
// ---------------------------------------------------------------------------

function ShopFishCard({
  id,
  name,
  owned,
  price,
  pearls,
  onBuy,
}: {
  id: number;
  name: string;
  owned: boolean;
  price: number;
  pearls: number;
  onBuy: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.bgCard, owned && styles.bgCardSelected]}>
      <View style={styles.fishStage}>
        <FishSprite id={id} width={96} />
      </View>

      <Text style={styles.bgName} numberOfLines={1}>
        {name}
      </Text>

      {owned ? (
        <View style={styles.selectedPill}>
          <Text style={styles.selectedPillText}>{t('shop.shopFishOwned')}</Text>
        </View>
      ) : (
        <ChunkyButton
          label={t('shop.buy')}
          price={price}
          tone="aqua"
          disabled={pearls < price}
          onPress={onBuy}
          accessibilityLabel={t('shop.a11yBuy', { name: name, price: price })}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Aksesuar kartı
// ---------------------------------------------------------------------------

function AccessoryCard({
  id,
  name,
  owned,
  active,
  price,
  pearls,
  onBuy,
  onToggle,
}: {
  id: string;
  name: string;
  owned: boolean;
  active: boolean;
  price: number;
  pearls: number;
  onBuy: () => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const img = ACCESSORY_IMAGES[id];
  return (
    <View style={[styles.bgCard, active && styles.bgCardSelected]}>
      <View style={styles.fishStage}>
        {img && <Image source={img.closed} fadeDuration={0} resizeMode="contain" style={{ width: 96, height: 96 }} />}
      </View>

      <Text style={styles.bgName} numberOfLines={1}>
        {name}
      </Text>

      {owned ? (
        <ChunkyButton
          label={active ? t('shop.remove') : t('shop.use')}
          tone="gold"
          disabled={false}
          onPress={onToggle}
          accessibilityLabel={`${name} ${active ? t('shop.remove') : t('shop.use')}`}
        />
      ) : (
        <ChunkyButton
          label={t('shop.buy')}
          price={price}
          tone="aqua"
          disabled={pearls < price}
          onPress={onBuy}
          accessibilityLabel={t('shop.a11yBuy', { name: name, price: price })}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Arka plan kartı
// ---------------------------------------------------------------------------

const THUMB_W = 112;
const THUMB_H = 190;

function BackgroundCard({
  name,
  source,
  selected,
  unlocked,
  unlockLevel,
  price,
  pearls,
  onSelect,
  onBuy,
}: {
  name: string;
  source: ImageSourcePropType;
  selected: boolean;
  unlocked: boolean;
  // Açılış leveli (yalnızca inciyle alınanlarda null)
  unlockLevel: number | null;
  price?: number;
  pearls: number;
  onSelect: () => void;
  onBuy?: () => void;
}) {
  const { t } = useTranslation();
  const canBuy = price !== undefined && pearls >= price;

  return (
    <View style={[styles.bgCard, selected && styles.bgCardSelected]}>
      <View style={styles.bgThumb}>
        <Image source={source} fadeDuration={0} resizeMode="cover" style={styles.bgThumbImage} />
        {!unlocked && (
          <View style={styles.bgLockOverlay}>
            <LockIcon size={26} color="#cfd8dc" />
            <Text style={styles.bgLockText}>
              {unlockLevel !== null ? t('shop.unlockAt', { n: unlockLevel }) : t('shop.locked')}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.bgName} numberOfLines={1}>
        {name}
      </Text>

      {selected ? (
        <View style={styles.selectedPill}>
          <Text style={styles.selectedPillText}>{t('shop.selected')}</Text>
        </View>
      ) : unlocked ? (
        <ChunkyButton
          label={t('shop.select')}
          tone="gold"
          disabled={false}
          onPress={onSelect}
          accessibilityLabel={`${name} ${t('shop.select')}`}
        />
      ) : (
        <ChunkyButton
          label={t('shop.buy')}
          price={price}
          tone="aqua"
          disabled={!canBuy}
          onPress={onBuy ?? (() => {})}
          accessibilityLabel={t('shop.a11yBuy', { name: name, price: price ?? 0 })}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ekran
// ---------------------------------------------------------------------------

export default function ShopScreen() {
  const { t } = useTranslation();
  const pearls = useGameStore((s) => s.pearls);
  const eggs = useGameStore((s) => s.eggs);
  const food = useGameStore((s) => s.food);
  const buyFood = useGameStore((s) => s.buyFood);
  const ownedFish = useGameStore((s) => s.ownedFish);
  const ownedDecor = useGameStore((s) => s.ownedDecor);
  const selectedBackground = useGameStore((s) => s.selectedBackground);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const hapticsEnabled = useGameStore((s) => s.settings.haptics);
  const openEgg = useGameStore((s) => s.openEgg);
  const buyEgg = useGameStore((s) => s.buyEgg);
  const buyDecor = useGameStore((s) => s.buyDecor);
  const buyFish = useGameStore((s) => s.buyFish);
  const selectBackground = useGameStore((s) => s.selectBackground);
  const selectedAccessories = useGameStore((s) => s.selectedAccessories);
  const toggleAccessory = useGameStore((s) => s.toggleAccessory);

  const [lastEgg, setLastEgg] = useState<EggResult | null>(null);
  const [openedKind, setOpenedKind] = useState<EggKind>('normal');

  const pearlPop = usePop(pearls);

  const { owned, total } = useMemo(() => {
    const list = getUnlockedFish(currentLevel).filter((f) => !f.storeOnly);
    return {
      owned: list.filter((f) => (ownedFish[f.id] ?? 0) > 0).length,
      total: list.length,
    };
  }, [currentLevel, ownedFish]);
  const progress = total > 0 ? Math.min(1, owned / total) : 0;

  const shopFish = useMemo(() => getUnlockedFish(currentLevel).filter((f) => f.storeOnly), [currentLevel]);

  const backgrounds = useMemo(
    () =>
      DECOR.filter((d) => d.kind === 'background').map((def) => ({
        def,
        unlocked: isDecorUnlocked(def, ownedDecor, currentLevel),
      })),
    [ownedDecor, currentLevel]
  );
  const accessories = useMemo(() => DECOR.filter((d) => d.kind === 'accessory'), []);
  const activeBackground = resolveBackgroundId(selectedBackground, DECOR, ownedDecor, currentLevel);

  const handleOpen = (kind: EggKind) => {
    const result = openEgg(kind);
    if (result) {
      if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setOpenedKind(kind);
      setLastEgg(result);
    }
  };

  const handleBuy = (kind: EggKind) => {
    if (buyEgg(kind)) {
      if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      SoundManager.play('helperUse');
    }
  };

  const handleBuyFood = () => {
    if (buyFood()) {
      if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      SoundManager.play('helperUse');
    }
  };

  const handleBuyFish = (id: number) => {
    if (buyFish(id)) {
      if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      SoundManager.play('helperUse');
    }
  };

  const handleToggleAccessory = (id: string) => {
    if (toggleAccessory(id) && hapticsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelectBackground = (id: string) => {
    if (selectBackground(id) && hapticsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleBuyBackground = (id: string) => {
    if (buyDecor(id)) {
      if (hapticsEnabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      SoundManager.play('helperUse');
    }
  };

  return (
    <View style={styles.root}>
      <PuzzleBackground />

      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('shop.title')}</Text>
            <Animated.View style={[styles.pearlPill, pearlPop]}>
              <PearlIcon size={20} />
              <Text style={styles.pearlValue}>{pearls}</Text>
            </Animated.View>
          </View>

          <View style={styles.collection}>
            <View style={styles.collectionRow}>
              <Text style={styles.collectionLabel}>{t('shop.collection')}</Text>
              <Text style={styles.collectionCount}>
                {owned}/{total}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          <View style={styles.stallRow}>
            {(['normal', 'rare'] as EggKind[]).map((kind) => (
              <EggStall
                key={kind}
                kind={kind}
                count={eggs[kind]}
                pearls={pearls}
                price={eggPrice(kind, currentLevel)}
                onOpen={() => handleOpen(kind)}
                onBuy={() => handleBuy(kind)}
              />
            ))}
          </View>

          <FoodStall count={food} pearls={pearls} onBuy={handleBuyFood} />

          {shopFish.length > 0 && (
            <View style={styles.bgSection}>
              <Text style={styles.sectionTitle}>{t('shop.shopFish')}</Text>
              <Text style={styles.sectionHint}>{t('shop.shopFishHint')}</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bgRow}
              >
                {shopFish.map((f) => (
                  <ShopFishCard
                    key={f.id}
                    id={f.id}
                    name={f.name}
                    owned={(ownedFish[f.id] ?? 0) > 0}
                    price={SHOP_FISH_PRICE}
                    pearls={pearls}
                    onBuy={() => handleBuyFish(f.id)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {accessories.length > 0 && (
            <View style={styles.bgSection}>
              <Text style={styles.sectionTitle}>{t('shop.accessories')}</Text>
              <Text style={styles.sectionHint}>{t('shop.accessoriesHint')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bgRow}
              >
                {accessories.map((a) => (
                  <AccessoryCard
                    key={a.id}
                    id={a.id}
                    name={t(`decor.${a.id}`, { defaultValue: a.name })}
                    owned={ownedDecor.includes(a.id)}
                    active={selectedAccessories.includes(a.id)}
                    price={a.price}
                    pearls={pearls}
                    onBuy={() => handleBuyBackground(a.id)}
                    onToggle={() => handleToggleAccessory(a.id)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.bgSection}>
            <Text style={styles.sectionTitle}>{t('shop.backgrounds')}</Text>
            <Text style={styles.sectionHint}>{t('shop.backgroundsHint')}</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bgRow}
            >
              <BackgroundCard
                name={t('shop.defaultBackground')}
                source={getBackgroundImage(DEFAULT_BACKGROUND_ID)}
                selected={activeBackground === DEFAULT_BACKGROUND_ID}
                unlocked
                unlockLevel={null}
                pearls={pearls}
                onSelect={() => handleSelectBackground(DEFAULT_BACKGROUND_ID)}
              />
              {backgrounds.map(({ def, unlocked }) => (
                <BackgroundCard
                  key={def.id}
                  name={t(`decor.${def.id}`, { defaultValue: def.name })}
                  source={getBackgroundImage(def.id)}
                  selected={activeBackground === def.id}
                  unlocked={unlocked}
                  unlockLevel={def.unlockLevel}
                  price={def.price}
                  pearls={pearls}
                  onSelect={() => handleSelectBackground(def.id)}
                  onBuy={() => handleBuyBackground(def.id)}
                />
              ))}
            </ScrollView>
          </View>

          <IapSection />
        </ScrollView>
      </SafeAreaView>

      <EggModal
        visible={!!lastEgg}
        kind={openedKind}
        result={lastEgg}
        eggsLeft={eggs[openedKind]}
        onClose={() => setLastEgg(null)}
        onOpenAnother={() => handleOpen(openedKind)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b3d5c',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0,20,50,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  pearlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.panel,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pearlValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },

  collection: {
    gap: 7,
  },
  collectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  collectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0,20,50,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  collectionCount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.gold,
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(6,28,58,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.aqua,
  },

  stallRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  stall: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.panel,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  stallRare: {
    borderColor: COLORS.amethyst,
    shadowColor: COLORS.amethyst,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  stallName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  stallSub: {
    marginTop: 3,
    minHeight: 32,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.soft,
    textAlign: 'center',
  },
  stallButtons: {
    alignSelf: 'stretch',
    marginTop: 10,
    gap: 8,
  },

  foodStall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.panel,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  foodInfo: {
    flex: 1,
    gap: 3,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  foodSub: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.soft,
  },
  foodStock: {
    alignSelf: 'flex-start',
    marginTop: 2,
    backgroundColor: 'rgba(255,204,128,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  foodStockText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffcc80',
  },
  foodBuy: {
    width: 118,
    gap: 4,
  },

  eggStage: {
    width: '100%',
    height: EGG_SIZE + 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eggGlow: {
    position: 'absolute',
    width: EGG_SIZE * 1.25,
    height: EGG_SIZE * 1.25,
    borderRadius: 999,
    backgroundColor: 'rgba(186,104,200,0.45)',
  },
  dais: {
    position: 'absolute',
    bottom: 2,
    width: EGG_SIZE * 0.85,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  countBadge: {
    position: 'absolute',
    top: 2,
    right: 6,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    borderWidth: 2.5,
    borderColor: '#0b3d5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.goldText,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 14,
    borderBottomWidth: 4,
    paddingHorizontal: 10,
  },
  btnPressed: {
    transform: [{ translateY: 3 }],
    opacity: 0.92,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '900',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dimmed: {
    opacity: 0.5,
  },
  missing: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffab91',
    textAlign: 'center',
  },
  missingHidden: {
    opacity: 0,
  },

  bgSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0,20,50,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sectionHint: {
    marginTop: -6,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.soft,
  },
  bgRow: {
    gap: 12,
    paddingRight: 4,
  },
  bgCard: {
    width: THUMB_W + 22,
    backgroundColor: COLORS.panel,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    borderRadius: 22,
    padding: 10,
    gap: 8,
  },
  bgCardSelected: {
    borderColor: COLORS.gold,
  },
  bgThumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0d3b7a',
  },
  fishStage: {
    width: THUMB_W,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,28,58,0.35)',
  },
  bgThumbImage: {
    width: '100%',
    height: '100%',
  },
  bgLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2,14,34,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  bgLockText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cfd8dc',
    textAlign: 'center',
  },
  bgName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  selectedPill: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,213,79,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPillText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.gold,
  },
});