import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  InteractionManager,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AquariumView } from '@/components/aquarium/AquariumView';
import { PlayButton, TopBar } from '@/components/ui/HomeHud';
import { FISH, getUnlockedFish } from '@/data';
import '@/game/bakedLevels';
import { prefetchLevel } from '@/game/levelGenerator';
import { bonusPercent } from '@/game/rewards';
import type { Rarity } from '@/game/types';
import { useGameStore } from '@/store/gameStore';

// i18n kurulunca bu nesne dil dosyalarına taşınacak.
const TEXT = {
  play: 'Oyna',
  level: 'Level',
  eggs: (n: number) => `${n} yumurtan var, aç`,
  bonus: 'bonus',
  pearls: 'İnci',
  bonusLabel: 'Bonus',
  fish: 'Balık',
};

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b0bec5',
  rare: '#4fc3f7',
  epic: '#ba68c8',
  legendary: '#ffd54f',
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Yaygın',
  rare: 'Nadir',
  epic: 'Epik',
  legendary: 'Efsanevi',
};

const TOP_PAD = 10;
const PILL_H = 42;

export default function AquariumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const currentLevel = useGameStore((s) => s.currentLevel);
  const pearls = useGameStore((s) => s.pearls);
  const eggs = useGameStore((s) => s.eggs);
  const ownedFish = useGameStore((s) => s.ownedFish);

  const [height, setHeight] = useState(0);
  const [tappedId, setTappedId] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  // Oyna'ya basılmadan önce girilecek level hazırlanır (hazır listede yoksa arka planda üretilir).
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      prefetchLevel(currentLevel);
    });
    return () => task.cancel();
  }, [currentLevel]);

  const fishList = getUnlockedFish(currentLevel);
  const ownedIds = fishList.filter((f) => (ownedFish[f.id] ?? 0) > 0).map((f) => f.id);
  const bonus = bonusPercent(ownedFish, fishList);
  const tappedFish = tappedId === null ? null : (FISH.find((f) => f.id === tappedId) ?? null);
  const eggCount = eggs.normal + eggs.rare;

  const onLayout = (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height));

  const onFishPress = (id: number) => {
    setTappedId(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTappedId(null), 2500);
  };

  const play = () => {
    router.push({ pathname: '/play/[level]', params: { level: String(currentLevel) } });
  };

  // Balıklar üstteki göstergelerin altında yüzsün.
  const swimTop = insets.top + TOP_PAD + PILL_H + 14;

  return (
    <View style={styles.root} onLayout={onLayout}>
      {height > 0 && (
        <AquariumView
          fishIds={ownedIds}
          height={height}
          radius={0}
          topInset={swimTop}
          onFishPress={onFishPress}
        />
      )}

      <View
        pointerEvents="box-none"
        style={[styles.topBar, { paddingTop: insets.top + TOP_PAD }]}
      >
        <TopBar
          pearls={pearls}
          bonusPct={bonus}
          fishOwned={ownedIds.length}
          fishTotal={fishList.length}
          labels={{ pearls: TEXT.pearls, bonus: TEXT.bonusLabel, fish: TEXT.fish }}
        />
      </View>

      <View pointerEvents="box-none" style={styles.bottom}>
        {tappedFish && (
          <View style={styles.caption}>
            <Text style={[styles.captionText, { color: RARITY_COLOR[tappedFish.rarity] }]}>
              {tappedFish.name} · {RARITY_LABEL[tappedFish.rarity]} · +{tappedFish.bonusPct}%{' '}
              {TEXT.bonus}
            </Text>
          </View>
        )}

        {eggCount > 0 && (
          <Pressable style={styles.eggHint} onPress={() => router.navigate('/shop')}>
            <Text style={styles.eggHintText}>{TEXT.eggs(eggCount)}</Text>
          </Pressable>
        )}

        <PlayButton
          title={TEXT.play}
          subtitle={`${TEXT.level} ${currentLevel}`}
          onPress={play}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1b5a8a',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 20,
    gap: 12,
    alignItems: 'center',
  },
  caption: {
    alignSelf: 'center',
    backgroundColor: 'rgba(6,28,58,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  captionText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  eggHint: {
    alignSelf: 'center',
    backgroundColor: '#ffd54f',
    borderRadius: 999,
    borderBottomWidth: 4,
    borderBottomColor: '#c99a14',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  eggHintText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4a3500',
  },
});