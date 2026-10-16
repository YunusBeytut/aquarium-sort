import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board, type Flight } from '@/components/puzzle/Board';
import { StarIcon } from '@/components/puzzle/FishSprite';
import { HelperBar } from '@/components/puzzle/HelperBar';
import { PuzzleBackground } from '@/components/puzzle/PuzzleBackground';
import { PlayButton } from '@/components/ui/HomeHud';
import { getUnlockedFish } from '@/data';
import '@/game/bakedLevels';
import { loadLevel, peekLevel, prefetchLevel, type GeneratedLevel } from '@/game/levelGenerator';
import { bonusPercent, type RewardResult } from '@/game/rewards';
import {
  Move,
  applyMove,
  getValidMoves,
  isSolved,
  revealAfterMove,
  undoMove,
} from '@/game/rules';
import { getHint } from '@/game/solver';
import { useGameStore } from '@/store/gameStore';

const UNDO_PER_LEVEL = 3;
const EXTRA_JAR_PER_LEVEL = 1;

// i18n kurulunca bu nesne dil dosyalarına taşınacak.
const TEXT = {
  home: '‹ Ana ekran',
  level: (n: number) => `Level ${n}`,
  moves: (n: number) => `Hamle: ${n}`,
  stuck: 'Geçerli hamle kalmadı. Geri al, ekstra kavanoz veya yeniden dene.',
  bossDone: 'Boss level tamamlandı!',
  levelDone: (n: number) => `Level ${n} tamamlandı!`,
  solvedIn: (n: number) => `${n} hamlede çözdün`,
  pearls: (n: number) => `+${n} inci`,
  bonus: (n: number) => `Balık bonusu: +${n}%`,
  hiddenBonus: (n: number) => `Gizli balık bonusu: +${n}%`,
  eggRare: '+1 Nadir yumurta',
  eggNormal: '+1 Normal yumurta',
  noReward: 'Bu leveli daha önce tamamlamıştın, ödül yok.',
  next: 'Devam',
  homeLink: 'Ana ekran',
  loadFailed: 'Level yüklenemedi',
  levelInfo: (owned: number, total: number, bonus: number) =>
    `${owned}/${total} balığın sende` + (bonus > 0 ? ` · bonus +${bonus}%` : ''),
  levelInfoNone: 'Bu leveldeki balıklar henüz sende değil',
  helpers: { undo: 'Geri al', extraJar: 'Kavanoz', hint: 'İpucu', restart: 'Yeniden' },
};

// Level başında belirir, birkaç saniye sonra kaybolur.
function LevelInfo({ text }: { text: string }) {
  const o = useSharedValue(0);

  useEffect(() => {
    o.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(3600, withTiming(0, { duration: 600 }))
    );
    return () => cancelAnimation(o);
  }, [o]);

  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: (1 - o.value) * -6 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.infoPill, style]}>
      <StarIcon size={16} />
      <Text style={styles.infoText}>{text}</Text>
    </Animated.View>
  );
}

export default function PlayScreen() {
  const params = useLocalSearchParams<{ level: string }>();
  const level = Math.max(1, Math.floor(Number(params.level)) || 1);
  // key sayesinde level değişince tüm state sıfırlanır
  return <LevelLoader key={level} level={level} />;
}

// Level hazırsa (baked ya da prefetch edilmişse) anında açılır. Değilse arka planda üretilirken
// arka plan ve yükleme göstergesi görünür; ekran geçişi JS thread'i kilitlenmediği için takılmaz.
function LevelLoader({ level }: { level: number }) {
  const router = useRouter();
  const [lv, setLv] = useState<GeneratedLevel | null>(() => peekLevel(level));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (lv) return;
    let alive = true;
    loadLevel(level).then(
      (l) => {
        if (alive) setLv(l);
      },
      () => {
        if (alive) setFailed(true);
      }
    );
    return () => {
      alive = false;
    };
  }, [level, lv]);

  if (lv) return <LevelPlay level={level} lv={lv} />;

  return (
    <View style={styles.root}>
      <PuzzleBackground />
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          {failed ? (
            <>
              <Text style={styles.stuck}>{TEXT.loadFailed}</Text>
              <Pressable onPress={() => router.replace('/')} hitSlop={10}>
                <Text style={styles.cardLink}>{TEXT.homeLink}</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator size="large" color="#ffffff" />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function LevelPlay({ level, lv }: { level: number; lv: GeneratedLevel }) {
  const router = useRouter();
  const completeLevel = useGameStore((s) => s.completeLevel);
  const ownedFish = useGameStore((s) => s.ownedFish);
  const currentLevel = useGameStore((s) => s.currentLevel);

  const capacity = lv.capacity;

  // Sonraki level, bu level oynanırken arka planda hazırlanır (geçişte bekleme olmasın).
  // Tahta açılışıyla yarışmasın diye biraz gecikmeyle başlar.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => prefetchLevel(level + 1), 800);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [level]);

  // Level başındaki bilgi: bu leveldeki balıklardan kaçı sende, toplam ödül bonusu.
  // Level açılırken bir kez hesaplanır.
  const info = useMemo(() => {
    const ids = Array.from(new Set(lv.jars.flat()));
    const owned = ids.filter((id) => (ownedFish[id] ?? 0) > 0).length;
    const bonus = bonusPercent(ownedFish, getUnlockedFish(currentLevel));
    return { owned, total: ids.length, bonus };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lv]);

  const [jars, setJars] = useState<number[][]>(lv.jars);
  // Her kavanozda alttaki kaç balığın gizli olduğu (oyuncu körlemesine oynar).
  const [hidden, setHidden] = useState<number[]>(lv.hidden);
  const [selected, setSelected] = useState<number | null>(null);
  // Geri alınca gizli durum da eski haline dönsün diye hamleyle birlikte saklanır.
  const [history, setHistory] = useState<{ move: Move; hidden: number[] }[]>([]);
  const [undoLeft, setUndoLeft] = useState(UNDO_PER_LEVEL);
  const [extraJarLeft, setExtraJarLeft] = useState(EXTRA_JAR_PER_LEVEL);
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const [invalidJar, setInvalidJar] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const flightSeq = useRef(0);
  const invalidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardGiven = useRef(false);
  // Taşıma animasyonu sürerken yapılan dokunuşlar kaybolmaz, burada sıraya girer.
  const pressQueue = useRef<number[]>([]);
  const [boardKey, setBoardKey] = useState(0);

  // Tahta, ilk kare çizildikten hemen sonra eklenir: üst çubuk ve arka plan anında görünür.
  // Tahtanın ağır kısmı (balıklar) zaten Board içinde kademeli çizilir.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const solved = useMemo(() => isSolved(jars, capacity), [jars, capacity]);
  const stuck = useMemo(
    () => !solved && !flight && getValidMoves(jars, capacity).length === 0,
    [solved, flight, jars, capacity]
  );
  // Son balık inmeden sonuç ekranı açılmasın
  const showResult = solved && !flight;

  // Level çözülünce ödül tam bir kez verilir
  useEffect(() => {
    if (solved && !rewardGiven.current) {
      rewardGiven.current = true;
      setReward(completeLevel(level, moveCount, lv.hidden.some((h) => h > 0)));
    }
  }, [solved, level, moveCount, completeLevel, lv]);

  const flashInvalid = useCallback((index: number) => {
    setInvalidJar(index);
    if (invalidTimer.current) clearTimeout(invalidTimer.current);
    invalidTimer.current = setTimeout(() => setInvalidJar(null), 350);
  }, []);

  const handleFlightDone = useCallback((id: number) => {
    setFlight((f) => (f && f.id === id ? null : f));
  }, []);

  const handleJarPress = (index: number) => {
    if (solved) return;
    // Balıklar uçarken gelen dokunuşlar sıraya alınır, inince sırayla işlenir (en fazla 4).
    if (flight) {
      if (pressQueue.current.length < 4) pressQueue.current.push(index);
      return;
    }
    setHint(null);

    if (selected === null) {
      if (jars[index].length === 0) return;
      setSelected(index);
      return;
    }

    if (selected === index) {
      setSelected(null);
      return;
    }

    const result = applyMove(jars, selected, index, capacity);
    if (!result) {
      flashInvalid(index);
      setSelected(null);
      return;
    }

    const fromJar = jars[selected];
    const toJar = jars[index];
    const count = result.jars[index].length - toJar.length;
    if (count > 0) {
      setFlight({
        id: ++flightSeq.current,
        from: selected,
        to: index,
        count,
        fishId: fromJar[fromJar.length - 1],
        fromLen: fromJar.length,
        toLen: toJar.length,
      });
    }

    setJars(result.jars);
    setHidden(revealAfterMove(result.jars, hidden, selected));
    setHistory((h) => [...h, { move: result.move, hidden }]);
    setMoveCount((c) => c + 1);
    setSelected(null);
  };

  // Uçuş bitince sıradaki dokunuşu işle. Her render sonrası çalışır, her seferinde bir dokunuş alır.
  useEffect(() => {
    if (flight || solved || pressQueue.current.length === 0) return;
    const next = pressQueue.current.shift();
    if (next !== undefined) handleJarPress(next);
  });

  const handleUndo = () => {
    if (solved || flight || undoLeft <= 0 || history.length === 0) return;
    const last = history[history.length - 1];
    setJars(undoMove(jars, last.move));
    setHidden(last.hidden);
    setHistory(history.slice(0, -1));
    setUndoLeft(undoLeft - 1);
    setSelected(null);
    setHint(null);
  };

  const handleExtraJar = () => {
    if (solved || flight || extraJarLeft <= 0) return;
    setJars([...jars, []]);
    setHidden([...hidden, 0]);
    setExtraJarLeft(extraJarLeft - 1);
    setSelected(null);
    setHint(null);
  };

  const handleHint = () => {
    if (solved || flight) return;
    const move = getHint(jars, capacity);
    if (move) {
      setHint({ from: move.from, to: move.to });
      setSelected(null);
    }
  };

  const handleRestart = () => {
    if (solved) return;
    pressQueue.current = [];
    setBoardKey((k) => k + 1); // tahtayı sıfırlar, süren görsel efektler de temizlenir
    setFlight(null);
    setJars(lv.jars);
    setHidden(lv.hidden);
    setSelected(null);
    setHistory([]);
    setUndoLeft(UNDO_PER_LEVEL);
    setExtraJarLeft(EXTRA_JAR_PER_LEVEL);
    setHint(null);
    setMoveCount(0);
  };

  // Ekran geçişi yapmadan aynı ekranda level'i değiştirir (gri geçiş ekranı olmaz).
  // PlayScreen'deki key, tüm state'i yeni level için sıfırlar.
  const goToLevel = (n: number) => {
    router.setParams({ level: String(n) });
  };

  return (
    <View style={styles.root}>
      <PuzzleBackground />

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/')} hitSlop={10}>
            <Text style={[styles.headerLink, styles.shadow]}>{TEXT.home}</Text>
          </Pressable>
          <Text style={[styles.title, styles.shadow]}>{TEXT.level(level)}</Text>
          <Text style={[styles.moves, styles.shadow]}>{TEXT.moves(moveCount)}</Text>
        </View>

        <View style={styles.infoRow}>
          <LevelInfo
            text={
              info.owned > 0
                ? TEXT.levelInfo(info.owned, info.total, info.bonus)
                : TEXT.levelInfoNone
            }
          />
        </View>

        <View style={styles.boardArea}>
          {ready && (
            <Board
              key={boardKey}
              jars={jars}
              hidden={hidden}
              capacity={capacity}
              selected={selected}
              hint={hint}
              invalidJar={invalidJar}
              flight={flight}
              onJarPress={handleJarPress}
              onFlightDone={handleFlightDone}
            />
          )}
        </View>

        {stuck && <Text style={styles.stuck}>{TEXT.stuck}</Text>}

        <View style={styles.footer}>
          <HelperBar
            undoLeft={undoLeft}
            extraJarLeft={extraJarLeft}
            canUndo={history.length > 0}
            onUndo={handleUndo}
            onExtraJar={handleExtraJar}
            onHint={handleHint}
            onRestart={handleRestart}
            labels={TEXT.helpers}
          />
        </View>

        {showResult && (
          <View style={styles.overlay}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {reward?.boss ? TEXT.bossDone : TEXT.levelDone(level)}
              </Text>
              <Text style={styles.cardText}>{TEXT.solvedIn(moveCount)}</Text>

              {reward ? (
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardPearls}>{TEXT.pearls(reward.pearls)}</Text>
                  {reward.bonusPct > 0 && (
                    <Text style={styles.rewardSub}>{TEXT.bonus(reward.bonusPct)}</Text>
                  )}
                  {reward.hiddenBonusPct > 0 && (
                    <Text style={styles.rewardSub}>{TEXT.hiddenBonus(reward.hiddenBonusPct)}</Text>
                  )}
                  {reward.egg && (
                    <Text style={styles.rewardEgg}>
                      {reward.egg === 'rare' ? TEXT.eggRare : TEXT.eggNormal}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.cardText}>{TEXT.noReward}</Text>
              )}

              <View style={styles.cardButton}>
                <PlayButton title={TEXT.next} onPress={() => goToLevel(level + 1)} />
              </View>
              <Pressable onPress={() => router.replace('/')} hitSlop={10}>
                <Text style={styles.cardLink}>{TEXT.homeLink}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d3b7a',
  },
  container: {
    flex: 1,
  },
  shadow: {
    textShadowColor: 'rgba(0,20,50,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLink: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    minWidth: 90,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  moves: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 90,
    textAlign: 'right',
  },
  infoRow: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6,28,58,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  infoText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  boardArea: {
    flex: 1,
    justifyContent: 'center',
  },
  stuck: {
    color: '#ffe0b2',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingBottom: 10,
    textShadowColor: 'rgba(0,20,50,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footer: {
    paddingTop: 10,
    paddingBottom: 18,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2,14,34,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    maxWidth: 380,
    backgroundColor: '#0f3a6b',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 26,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  cardText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  rewardBox: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  rewardPearls: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffe082',
  },
  rewardSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  rewardEgg: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ce93d8',
  },
  cardButton: {
    alignSelf: 'stretch',
    marginTop: 6,
  },
  cardLink: {
    color: '#9be3fb',
    fontSize: 14,
    fontWeight: '700',
  },
});