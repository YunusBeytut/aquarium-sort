import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { SoundManager } from '@/audio/SoundManager';
import { AdBanner } from '@/components/AdBanner';
import { Board, type Flight, type Guide } from '@/components/puzzle/Board';
import { StarIcon } from '@/components/puzzle/FishSprite';
import { HelperBar } from '@/components/puzzle/HelperBar';
import { PuzzleBackground } from '@/components/puzzle/PuzzleBackground';
import { PlayButton } from '@/components/ui/HomeHud';
import { FISH } from '@/data';
import { pickSkin } from '@/game/skin';
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
import {
  TUTORIAL_HELPERS_FROM_LEVEL,
  TUTORIAL_IDLE_MS,
  TUTORIAL_LAST_LEVEL,
} from '@/game/tutorialLevels';
import { AdManager } from '@/services/ads';
import { Analytics } from '@/services/analytics';
import { FishLoader } from '@/components/ui/FishLoader';
import { BoosterRefillModal } from '@/components/puzzle/BoosterRefillModal';
import { BOOSTER_AD_REWARD, BOOSTER_PRICE } from '@/game/economy';
import { useGameStore } from '@/store/gameStore';

const UNDO_PER_LEVEL = 3;
const EXTRA_JAR_PER_LEVEL = 1;

// ---------------------------------------------------------------------------
// Üst çubuk: alttaki HelperBar butonlarıyla aynı "kalın dudaklı" stil
// ---------------------------------------------------------------------------

const HEAD_ICON_COLOR = '#06304d';
const HEAD_FACE_H = 44;
const HEAD_LIP = 5;

const HOME_ICON = ['M3 11 L12 4 L21 11', 'M6 9.5 V20 H18 V9.5'];

function HeadIcon({ d, size = 20 }: { d: string[]; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {d.map((p, i) => (
        <Path
          key={i}
          d={p}
          stroke={HEAD_ICON_COLOR}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

type HeadChipProps = {
  label: string;
  face: string;
  lip: string;
  edge: string;
  icon?: string[];
  big?: boolean;
  width?: number;
  onPress?: () => void;
};

// onPress verilirse basılabilir buton, verilmezse yalnızca bilgi etiketi.
function HeadChip({ label, face, lip, edge, icon, big, width, onPress }: HeadChipProps) {
  const pressed = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * (HEAD_LIP - 2) }],
  }));

  const content = (
    <>
      <View style={[styles.headLip, { backgroundColor: lip }]} />
      <Animated.View
        style={[styles.headFace, { backgroundColor: face, borderColor: edge }, faceStyle]}
      >
        {icon && <HeadIcon d={icon} />}
        <Text style={[styles.headLabel, big && styles.headLabelBig]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </>
  );

  if (!onPress) {
    return (
      <View pointerEvents="none" style={[styles.headSlot, width !== undefined && { width }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 12, stiffness: 300 });
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.headSlot, width !== undefined && { width }]}
    >
      {content}
    </Pressable>
  );
}

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
  const { t } = useTranslation();
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
              <Text style={styles.stuck}>{t('play.loadFailed')}</Text>
              <Pressable onPress={() => router.replace('/')} hitSlop={10}>
                <Text style={styles.cardLink}>{t('play.homeLink')}</Text>
              </Pressable>
            </>
          ) : (
            <FishLoader />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function LevelPlay({ level, lv }: { level: number; lv: GeneratedLevel }) {
  const { t } = useTranslation();
  const router = useRouter();
  const helperLabels = {
    undo: t('play.helpers.undo'),
    extraJar: t('play.helpers.extraJar'),
    hint: t('play.helpers.hint'),
    restart: t('play.helpers.restart'),
  };
  const completeLevel = useGameStore((s) => s.completeLevel);
  const ownedFish = useGameStore((s) => s.ownedFish);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const hapticsEnabled = useGameStore((s) => s.settings.haptics);
  const tutorialDone = useGameStore((s) => s.tutorialDone);
  const boosters = useGameStore((s) => s.boosters);
  const pearls = useGameStore((s) => s.pearls);
  const spendBooster = useGameStore((s) => s.spendBooster);
  const addBooster = useGameStore((s) => s.addBooster);
  const buyBooster = useGameStore((s) => s.buyBooster);

  const capacity = lv.capacity;

  const startedAt = useRef(Date.now());
  const secs = () => Math.round((Date.now() - startedAt.current) / 1000);

  // Öğretici: ilk levellerde yazısız el animasyonu yol gösterir.
  const tutorialActive = !tutorialDone && level <= TUTORIAL_LAST_LEVEL;
  // Level 1-2'de alttaki yardımcı düğmeler görünmez, oyuncu yalnızca kavanozlara odaklanır.
  const hideHelpers = tutorialActive && level < TUTORIAL_HELPERS_FROM_LEVEL;

  useEffect(() => {
    Analytics.levelStart(level);
    if (tutorialActive) Analytics.tutorialStep(level, 'tutorial_level');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Ses dosyaları ilk açılışta bir kez yüklenir (tekrar çağrılması zararsız).
  useEffect(() => {
    SoundManager.init();
  }, []);

  // Level başındaki bilgi: bu leveldeki balıklardan kaçı sende, toplam ödül bonusu.
  // Level açılırken bir kez hesaplanır.
  const info = useMemo(() => {
    const ids = Array.from(new Set(lv.jars.flat()));
    const owned = ids.filter((id) => (ownedFish[id] ?? 0) > 0).length;
    const bonus = bonusPercent(ownedFish, FISH);
    return { owned, total: ids.length, bonus };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lv]);

  // Sahip olunan özel canlılar bazı levellerde görünüm olarak çıkar (öğreticide hayır).
  const skin = useMemo(
    () => (tutorialActive ? undefined : pickSkin(level, Array.from(new Set(lv.jars.flat())), ownedFish)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lv]
  );

  const [jars, setJars] = useState<number[][]>(lv.jars);
  // Her kavanozda alttaki kaç balığın gizli olduğu (oyuncu körlemesine oynar).
  const [hidden, setHidden] = useState<number[]>(lv.hidden);
  const [selected, setSelected] = useState<number | null>(null);
  // Geri alınca gizli durum da eski haline dönsün diye hamleyle birlikte saklanır.
  const [history, setHistory] = useState<{ move: Move; hidden: number[] }[]>([]);
  // Haklar kalıcı (store). Öğreticide hak harcanmaz.
  const undoLeft = tutorialActive ? UNDO_PER_LEVEL : boosters.undo;
  const extraJarLeft = tutorialActive ? EXTRA_JAR_PER_LEVEL : boosters.extraJar;
  const hintLeft = tutorialActive ? 3 : boosters.hint;
  const [refill, setRefill] = useState<'undo' | 'extraJar' | 'hint' | null>(null);
  const [refillNotice, setRefillNotice] = useState<string | null>(null);
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const [invalidJar, setInvalidJar] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const flightSeq = useRef(0);
  // Sadece aktif uçuşun bitişinde düşme sesi çalsın (restart sonrası eski uçuşlar ses çıkarmasın).
  const activeFlightId = useRef<number | null>(null);
  // Bu uçuş bir kavanozu tamamlıyorsa, balık inince "ding" çalınır.
  const jarDingFlightId = useRef<number | null>(null);
  const invalidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardGiven = useRef(false);
  const completeSoundPlayed = useRef(false);
  // Taşıma animasyonu sürerken yapılan dokunuşlar kaybolmaz, burada sıraya girer.
  const pressQueue = useRef<number[]>([]);
  const [boardKey, setBoardKey] = useState(0);
  // Level/ana sayfa geçişinde ağır mount başlamadan önce yükleme ekranı çizilsin diye.
  const [navigating, setNavigating] = useState(false);

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

  // Öğretici eli: oyuncu bir süre dokunmazsa çıkar, dokunur dokunmaz kaybolur.
  // Level 1-2'de hızlı, level 3'te yalnızca oyuncu beklerse görünür.
  const [guideOn, setGuideOn] = useState(false);
  useEffect(() => {
    setGuideOn(false);
    if (!tutorialActive || solved || flight || stuck || !ready) return;
    const [first, later] = TUTORIAL_IDLE_MS[level] ?? [4000, 4000];
    const t = setTimeout(
      () => setGuideOn(true),
      moveCount === 0 && selected === null ? first : later
    );
    return () => clearTimeout(t);
  }, [tutorialActive, solved, flight, stuck, ready, moveCount, selected, level, boardKey]);

  // Gösterilecek hamle çözücüden gelir; oyuncu yanlış yola girse de el mevcut durumdan devam eder.
  const guide = useMemo<Guide | null>(() => {
    if (!guideOn) return null;
    const move = getHint(jars, capacity);
    if (!move) return null;
    return {
      from: move.from,
      to: move.to,
      phase: selected === move.from ? 'drop' : 'pick',
    };
  }, [guideOn, jars, capacity, selected]);

  // Hamle kalmayınca yumuşak bir ses; son balığın damla sesinden sonra gelsin diye kısa gecikme.
  useEffect(() => {
    if (!stuck) return;
    if (!tutorialActive) Analytics.levelFail(level, moveCount, secs());
    const t = setTimeout(() => SoundManager.play('noMoves'), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stuck]);

  // Level çözülünce ödül tam bir kez verilir
  useEffect(() => {
    if (solved && !rewardGiven.current) {
      rewardGiven.current = true;
      Analytics.levelComplete(level, moveCount, secs());
      if (tutorialActive && level >= TUTORIAL_LAST_LEVEL) Analytics.tutorialComplete();
      setReward(completeLevel(level, moveCount, lv.hidden.some((h) => h > 0)));
    }
  }, [solved, level, moveCount, completeLevel, lv]);

  // Level tamamlama sesi: son balık indikten (sonuç kartı açılırken) hemen sonra, damla sesiyle üst üste binmesin diye kısa gecikmeyle.
  useEffect(() => {
    if (!showResult || completeSoundPlayed.current) return;
    const t = setTimeout(() => {
      completeSoundPlayed.current = true;
      SoundManager.play('levelComplete');
    }, 250);
    return () => clearTimeout(t);
  }, [showResult]);

  const flashInvalid = useCallback((index: number) => {
    SoundManager.play('invalidMove');
    setInvalidJar(index);
    if (invalidTimer.current) clearTimeout(invalidTimer.current);
    invalidTimer.current = setTimeout(() => setInvalidJar(null), 350);
  }, []);

  const handleFlightDone = useCallback((id: number) => {
    if (activeFlightId.current === id) {
      activeFlightId.current = null;
      SoundManager.play('fishLand');
      if (jarDingFlightId.current === id) {
        jarDingFlightId.current = null;
        // Damla sesiyle üst üste binmesin diye kısa gecikme.
        setTimeout(() => SoundManager.play('jarComplete'), 130);
      }
    }
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
      // Seçimde çok hafif titreşim (Ayarlar > Titreşim kapalıysa çalışmaz).
      if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    const newHidden = revealAfterMove(result.jars, hidden, selected);
    // Hedef kavanoz dolup tek tür balıkla tamamlandıysa (Board'daki "complete" görünümüyle aynı kural) ve level bitmediyse "ding".
    // Level bittiğinde onun yerine level tamamlama sesi çalar.
    const destJar = result.jars[index];
    const completesJar =
      destJar.length === capacity &&
      destJar.every((f) => f === destJar[0]) &&
      !isSolved(result.jars, capacity);
    if (count > 0) {
      const flightId = ++flightSeq.current;
      activeFlightId.current = flightId;
      jarDingFlightId.current = completesJar ? flightId : null;
      setFlight({
        id: flightId,
        from: selected,
        to: index,
        count,
        fishId: fromJar[fromJar.length - 1],
        fromLen: fromJar.length,
        toLen: toJar.length,
      });
    }

    setJars(result.jars);
    setHidden(newHidden);
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
    if (solved || flight || history.length === 0) return;
    if (undoLeft <= 0) {
      setRefillNotice(null);
      setRefill('undo');
      return;
    }
    if (!tutorialActive) spendBooster('undo');
    const last = history[history.length - 1];
    SoundManager.play('helperUse');
    setJars(undoMove(jars, last.move));
    setHidden(last.hidden);
    setHistory(history.slice(0, -1));
    setSelected(null);
    setHint(null);
  };

  const handleExtraJar = () => {
    if (solved || flight) return;
    if (extraJarLeft <= 0) {
      setRefillNotice(null);
      setRefill('extraJar');
      return;
    }
    if (!tutorialActive) spendBooster('extraJar');
    SoundManager.play('helperUse');
    setJars([...jars, []]);
    setHidden([...hidden, 0]);
    setSelected(null);
    setHint(null);
  };

  // Yenileme penceresi açılınca bir kez kaydedilir (reklam hazır mıydı bilgisiyle).
  useEffect(() => {
    if (refill) Analytics.refillShown(refill, AdManager.isRewardedReady);
  }, [refill]);

  const handleRefillWatch = async () => {
    const kind = refill;
    if (!kind) return;
    Analytics.refillChoice(kind, 'watch');
    const wasReady = AdManager.isRewardedReady;
    const ok = await AdManager.showRewarded();
    if (ok) {
      Analytics.adShown('rewarded', `booster_${kind}`);
      Analytics.adRewarded(`booster_${kind}`);
      addBooster(kind, BOOSTER_AD_REWARD);
      setRefill(null);
    } else {
      Analytics.adFailed(`booster_${kind}`, wasReady ? 'no_reward' : 'not_ready');
      setRefillNotice(t('play.adFailed'));
    }
  };

  const handleRefillBuy = () => {
    const kind = refill;
    if (kind && buyBooster(kind)) {
      Analytics.refillChoice(kind, 'buy');
      setRefill(null);
    }
  };

  const handleHint = () => {
    if (solved || flight) return;
    if (hintLeft <= 0) {
      setRefillNotice(null);
      setRefill('hint');
      return;
    }
    const move = getHint(jars, capacity);
    if (move) {
      if (!tutorialActive) spendBooster('hint');
      SoundManager.play('helperUse');
      setHint({ from: move.from, to: move.to });
      setSelected(null);
    }
  };

  const handleRestart = () => {
    if (solved) return;
    if (!tutorialActive) Analytics.levelRestart(level);
    pressQueue.current = [];
    activeFlightId.current = null;
    jarDingFlightId.current = null;
    setBoardKey((k) => k + 1); // tahtayı sıfırlar, süren görsel efektler de temizlenir
    setFlight(null);
    setJars(lv.jars);
    setHidden(lv.hidden);
    setSelected(null);
    setHistory([]);
    setHint(null);
    setMoveCount(0);
  };

  // Öğreticide hamle kalmazsa (yazı göstermeden) level kısa bir beklemeyle kendiliğinden yeniden başlar.
  useEffect(() => {
    if (!stuck || !tutorialActive) return;
    const t = setTimeout(handleRestart, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stuck, tutorialActive]);

  // Ekran geçişi yapmadan aynı ekranda level'i değiştirir (gri geçiş ekranı olmaz).
  // PlayScreen'deki key, tüm state'i yeni level için sıfırlar.
  const goToLevel = (n: number) => {
    router.setParams({ level: String(n) });
  };

  // Sonuç kartındaki "Devam": sıra gelmişse geçiş reklamı gösterilir, ardından sonraki level açılır.
  // Öğreticide reklam gösterilmez ve sayaç da işlemez.
  const handleNext = () => {
    if (navigating) return;
    setNavigating(true);
    // Yükleme ekranı bir kare çizilsin, sonra geçiş başlasın.
    setTimeout(() => {
      if (!tutorialActive) AdManager.maybeShowInterstitialAfterLevel();
      goToLevel(level + 1);
    }, 60);
  };

  const goHome = () => {
    if (navigating) return;
    setNavigating(true);
    setTimeout(() => router.replace('/'), 60);
  };

  // Banner öğreticide görünmez.
  const showBanner = !tutorialActive;

  return (
    <View style={styles.root}>
      <PuzzleBackground />

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <HeadChip
            label={t('play.home')}
            icon={HOME_ICON}
            face="#9fb8d8"
            lip="#5d7ba3"
            edge="#c7d8ee"
            width={HEAD_SIDE_W}
            onPress={goHome}
          />
          <HeadChip
            label={t('play.level', { n: level })}
            face="#ffd54f"
            lip="#c99a14"
            edge="#ffe69a"
            big
          />
          <HeadChip
            label={t('play.moves', { n: moveCount })}
            face="#58c8f2"
            lip="#2584b0"
            edge="#9be3fb"
            width={HEAD_SIDE_W}
          />
        </View>

        <View style={styles.infoRow}>
          {!tutorialActive && (
            <LevelInfo
              text={
                info.owned > 0
                  ? t(info.bonus > 0 ? 'play.levelInfoBonus' : 'play.levelInfo', {
                      owned: info.owned,
                      total: info.total,
                      bonus: info.bonus,
                    })
                  : t('play.levelInfoNone')
              }
            />
          )}
        </View>

        <View style={styles.boardArea}>
          {ready && (
            <Board
              key={boardKey}
              jars={jars}
              hidden={hidden}
              capacity={capacity}
              selected={selected}
              hint={hint ?? (guide ? { from: guide.from, to: guide.to } : null)}
              invalidJar={invalidJar}
              flight={flight}
              guide={guide}
              skin={skin}
              onJarPress={handleJarPress}
              onFlightDone={handleFlightDone}
            />
          )}
        </View>

        {stuck && !tutorialActive && <Text style={styles.stuck}>{t('play.stuck')}</Text>}

        <View
          style={[
            styles.footer,
            showBanner && styles.footerWithBanner,
            hideHelpers && styles.footerHidden,
          ]}
          pointerEvents={hideHelpers ? 'none' : 'auto'}
        >
          <HelperBar
            undoLeft={undoLeft}
            extraJarLeft={extraJarLeft}
            hintLeft={hintLeft}
            canUndo={history.length > 0}
            onUndo={handleUndo}
            onExtraJar={handleExtraJar}
            onHint={handleHint}
            onRestart={handleRestart}
            labels={helperLabels}
          />
        </View>

        <BoosterRefillModal
          visible={refill !== null}
          name={refill ? helperLabels[refill] : ''}
          amount={BOOSTER_AD_REWARD}
          price={BOOSTER_PRICE[refill ?? 'undo']}
          pearls={pearls}
          adReady={AdManager.isRewardedReady}
          notice={refillNotice}
          onWatch={handleRefillWatch}
          onBuy={handleRefillBuy}
          onClose={() => {
            if (refill) Analytics.refillChoice(refill, 'close');
            setRefill(null);
          }}
        />

        {/* Skill butonlarının altında; nav bar boşluğunu SafeAreaView zaten bırakıyor. */}
        {showBanner && <AdBanner />}

        {showResult && (
          <View style={styles.overlay}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {reward?.boss ? t('play.bossDone') : t('play.levelDone', { n: level })}
              </Text>
              <Text style={styles.cardText}>{t('play.solvedIn', { count: moveCount })}</Text>

              {reward ? (
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardPearls}>{t('play.pearls', { count: reward.pearls })}</Text>
                  {reward.bonusPct > 0 && (
                    <Text style={styles.rewardSub}>{t('play.bonus', { n: reward.bonusPct })}</Text>
                  )}
                  {reward.hiddenBonusPct > 0 && (
                    <Text style={styles.rewardSub}>{t('play.hiddenBonus', { n: reward.hiddenBonusPct })}</Text>
                  )}
                  {reward.egg && (
                    <Text style={styles.rewardEgg}>
                      {reward.egg === 'rare' ? t('play.eggRare') : t('play.eggNormal')}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.cardText}>{t('play.noReward')}</Text>
              )}

              <View style={styles.cardButton}>
                <PlayButton title={t('play.next')} onPress={handleNext} />
              </View>
              <Pressable onPress={goHome} hitSlop={10}>
                <Text style={styles.cardLink}>{t('play.homeLink')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>

      {navigating && <FishLoader fullscreen />}
    </View>
  );
}

const HEAD_SIDE_W = 104;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d3b7a',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headSlot: {
    height: HEAD_FACE_H + HEAD_LIP,
    minWidth: 96,
  },
  headLip: {
    position: 'absolute',
    top: HEAD_LIP,
    left: 0,
    right: 0,
    height: HEAD_FACE_H,
    borderRadius: 16,
  },
  headFace: {
    height: HEAD_FACE_H,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  headLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: HEAD_ICON_COLOR,
  },
  headLabelBig: {
    fontSize: 18,
    fontWeight: '900',
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
  // Banner altta olduğu için skill butonlarının alt boşluğu kısılır.
  footerWithBanner: {
    paddingBottom: 8,
  },
  footerHidden: {
    opacity: 0,
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