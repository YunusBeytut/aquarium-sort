import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  InteractionManager,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SoundManager } from '@/audio/SoundManager';
import { AquariumView } from '@/components/aquarium/AquariumView';
import { FishLoader } from '@/components/ui/FishLoader';
import { DailyStreakButton, DailyStreakModal } from '@/components/ui/DailyStreak';
import { PlayButton, TopBar } from '@/components/ui/HomeHud';
import { FISH, getUnlockedFish } from '@/data';
import '@/game/bakedLevels';
import { prefetchLevel } from '@/game/levelGenerator';
import { bonusPercent } from '@/game/rewards';
import { TUTORIAL_LAST_LEVEL } from '@/game/tutorialLevels';
import type { Rarity } from '@/game/types';
import { initPurchases } from '@/purchases';
import { useGameStore } from '@/store/gameStore';

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b0bec5',
  rare: '#4fc3f7',
  epic: '#ba68c8',
  legendary: '#ffd54f',
};

// Öğretici bu uygulama oturumunda bir kez doğrudan açılır. Oyuncu öğreticiden ana ekrana dönerse
// tekrar yönlendirilmez (ekranda sıkışıp kalmasın); bir sonraki açılışta yarım kalan öğretici sürer.
let tutorialLaunched = false;

const TOP_PAD = 10;
const PILL_H = 42;
const SELECT_MS = 5000; // seçili balığın durup büyük kaldığı süre (Besle'ye basmaya vakit kalsın)
const FEED_MS = 2400; // yem yeme animasyonu süresi (AquariumView EAT_MS ile aynı)
const FEED_SELECT_MS = FEED_MS + 1000; // besleme sırasında balık seçili ve durgun kalır

export default function AquariumScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const currentLevel = useGameStore((s) => s.currentLevel);
  const pearls = useGameStore((s) => s.pearls);
  const eggs = useGameStore((s) => s.eggs);
  const food = useGameStore((s) => s.food);
  const consumeFood = useGameStore((s) => s.consumeFood);
  const ownedFish = useGameStore((s) => s.ownedFish);
  const tutorialDone = useGameStore((s) => s.tutorialDone);
  const selectedAccessories = useGameStore((s) => s.selectedAccessories);

  // Kayıt yüklenmeden öğretici kararı verilmez (kayıtlı oyuncu yanlışlıkla öğreticiye düşmesin).
  const [hydrated, setHydrated] = useState(() => useGameStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useGameStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  // İlk açılışta (öğretici bitmemişken) ana ekran yerine doğrudan öğretici levele gidilir.
  const goTutorial =
    hydrated && !tutorialDone && currentLevel <= TUTORIAL_LAST_LEVEL && !tutorialLaunched;
  useEffect(() => {
    if (!goTutorial) return;
    tutorialLaunched = true;
    router.replace({ pathname: '/play/[level]', params: { level: String(currentLevel) } });
  }, [goTutorial, currentLevel, router]);

  // Ses sistemini ve arka plan müziğini ana ekranda başlat (tekrar çağrılması zararsız).
  useEffect(() => {
    SoundManager.init();
    void initPurchases();
  }, []);

  const [height, setHeight] = useState(0);
  const [dailyOpen, setDailyOpen] = useState(false);
  // Oyna'ya basınca level ekranı ağır mount olurken ana ekran donmuş görünmesin diye.
  const [navigating, setNavigating] = useState(false);
  useFocusEffect(
    useCallback(() => {
      return () => setNavigating(false);
    }, [])
  );
  const [tappedId, setTappedId] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedRequest, setFeedRequest] = useState<{ id: number; n: number } | null>(null);
  const lastFeedAt = useRef(0);

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
  const bonus = bonusPercent(ownedFish, FISH);
  const tappedFish = tappedId === null ? null : (FISH.find((f) => f.id === tappedId) ?? null);
  const eggCount = eggs.normal + eggs.rare;

  const onLayout = (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height));

  // Tıklanan balık durur ve büyür; aynı balığa tekrar basınca bırakır.
  const onFishPress = useCallback((id: number) => {
    if (timer.current) clearTimeout(timer.current);
    setTappedId((prev) => {
      if (prev === id) return null;
      timer.current = setTimeout(() => setTappedId(null), SELECT_MS);
      return id;
    });
  }, []);

  // Besle: seçili balığa 1 yem verir. Yem yoksa mağazaya gider. Animasyon sürerken tekrar basılamaz.
  const onFeedPress = () => {
    if (tappedId === null) return;
    if (food <= 0) {
      router.navigate('/shop');
      return;
    }
    const now = Date.now();
    if (now - lastFeedAt.current < FEED_MS) return;
    if (!consumeFood()) return;
    lastFeedAt.current = now;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTappedId(null), FEED_SELECT_MS);
    setFeedRequest((r) => ({ id: tappedId, n: (r?.n ?? 0) + 1 }));
  };

  const play = () => {
    if (navigating) return;
    setNavigating(true);
    // Yükleme ekranı bir kare çizilsin, sonra geçiş başlasın.
    setTimeout(() => {
      router.push({ pathname: '/play/[level]', params: { level: String(currentLevel) } });
    }, 60);
  };

  // Yönlendirme sürerken ana ekran bir an bile görünmesin.
  if (goTutorial) return <View style={styles.root} />;

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
          selectedId={tappedId}
          accessories={selectedAccessories}
          feedRequest={feedRequest}
          emptyText={t('home.emptyAquarium')}
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
          labels={{ pearls: t('home.pearls'), bonus: t('home.bonus'), fish: t('home.fish') }}
        />
      </View>

      {/* Günlük seri baloncuğu: sağ üstte, göstergelerin biraz altında. Öğretici bitince görünür. */}
      {tutorialDone && (
        <View
          pointerEvents="box-none"
          style={[styles.dailyBubble, { top: swimTop - 4 }]}
        >
          <DailyStreakButton onPress={() => setDailyOpen(true)} />
        </View>
      )}

      <View pointerEvents="box-none" style={styles.bottom}>
        {tappedFish && (
          <View style={styles.captionRow}>
            <View style={styles.caption}>
              <Text style={[styles.captionText, { color: RARITY_COLOR[tappedFish.rarity] }]}>
                {tappedFish.name} · {t(`rarity.${tappedFish.rarity}`)}
              </Text>
            </View>
            <Pressable
              style={[styles.feedBtn, food <= 0 && styles.feedBtnEmpty]}
              onPress={onFeedPress}
            >
              <Text style={styles.feedBtnText}>
                {food > 0
                  ? t('home.feed', { count: food, defaultValue: 'Feed · {{count}}' })
                  : t('home.getFood', { defaultValue: 'Get food' })}
              </Text>
            </Pressable>
          </View>
        )}

        {eggCount > 0 && (
          <Pressable style={styles.eggHint} onPress={() => router.navigate('/shop')}>
            <Text style={styles.eggHintText}>{t('home.eggs', { count: eggCount })}</Text>
          </Pressable>
        )}

        <PlayButton
          title={t('home.play')}
          subtitle={`${t('home.level')} ${currentLevel}`}
          onPress={play}
        />
      </View>

      <DailyStreakModal visible={dailyOpen} onClose={() => setDailyOpen(false)} />

      {navigating && <FishLoader fullscreen />}
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
  dailyBubble: {
    position: 'absolute',
    right: 14,
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
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  feedBtn: {
    backgroundColor: '#ffcc80',
    borderRadius: 999,
    borderBottomWidth: 4,
    borderBottomColor: '#c98f3a',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  feedBtnEmpty: {
    backgroundColor: '#ffd54f',
    borderBottomColor: '#c99a14',
  },
  feedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4a2d00',
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
    borderBottomWidth: 3,
    borderBottomColor: '#c99a14',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  eggHintText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4a3500',
  },
});