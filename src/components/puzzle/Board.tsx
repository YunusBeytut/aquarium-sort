import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlyingFish } from './FlyingFish';
import { BALL_SIZE, FISH_H, FISH_W, JAR_MARGIN_TOP, JAR_W, Jar, jarHeight, slotTopInJar } from './Jar';

export type Flight = {
  id: number;
  from: number;
  to: number;
  count: number; // taşınan balık sayısı
  fishId: number;
  fromLen: number; // taşımadan önce kaynak kavanozdaki balık sayısı
  toLen: number; // taşımadan önce hedef kavanozdaki balık sayısı
};

type Frame = { x: number; y: number; width: number; height: number };
type Progress = Record<number, { landed: number; settled: number }>;

type Props = {
  jars: number[][];
  // Her kavanozda alttaki kaç balık gizli ("?" olarak çizilir). Verilmezse hepsi açık.
  hidden?: number[];
  capacity: number;
  selected: number | null;
  hint: { from: number; to: number } | null;
  invalidJar: number | null;
  flight: Flight | null;
  onJarPress: (index: number) => void;
  onFlightDone: (id: number) => void;
};

const STAGGER_MS = 45;

// Tahtada bu sayıdan fazla balık varsa boşta salınım animasyonları kapatılır
// (düşük cihazlarda akıcılık için). 0 yaparsan hepsi kapanır, çok büyük yaparsan hep açık kalır.
const IDLE_ANIM_MAX_FISH = 60;

// Açılışta kavanoz çerçeveleri hemen çizilir, balıklar (ağır SVG'ler) kademeli eklenir.
// REVEAL_BATCH: her adımda balıkları çizilecek kavanoz sayısı. Küçültürsen daha akıcı ama
// biraz daha geç, büyütürsen daha hızlı ama o anda takılabilir. 99 yaparsan eski davranış.
const REVEAL_BATCH = 4;
const REVEAL_TICK_MS = 16;

// Tahta boyutlandırma: kavanozlar ekrandaki boş alana göre otomatik büyür/küçülür.
const MAX_SCALE = 1.15; // en fazla %15 büyür (az kavanozlu levellerde)
const MIN_SCALE = 0.7; // çok kavanozlu levellerde en fazla bu kadar küçülür
const SCALE_STEP = 0.01;
const COL_GAP = 8;
const ROW_GAP = 18;
const PAD_X = 12;
const V_MARGIN = 8; // alanın üst/altında bırakılan pay

function slotPoint(frame: Frame, capacity: number, slotIndex: number) {
  return {
    x: frame.x + (frame.width - FISH_W) / 2,
    y: frame.y + slotTopInJar(capacity, slotIndex) + (BALL_SIZE - FISH_H) / 2,
  };
}

// Bir satıra kaç kavanoz sığar (inner = kullanılabilir genişlik, padding hariç).
function perRow(innerWidth: number): number {
  return Math.max(1, Math.floor((innerWidth + COL_GAP) / (JAR_W + COL_GAP)));
}

// Verilen alana sığan en büyük ölçeği bulur. Satır sayısı, ölçek 1'deki satır sayısından
// asla fazla olmaz (yani büyütmek yüzünden 5+1 gibi çirkin dizilimler oluşmaz).
function pickScale(width: number, height: number, count: number, capacity: number): number {
  const itemH = JAR_MARGIN_TOP + jarHeight(capacity);
  const rowsAt = (s: number) => Math.ceil(count / perRow(width / s - PAD_X * 2));
  const heightAt = (s: number) => {
    const rows = rowsAt(s);
    return (rows * itemH + (rows - 1) * ROW_GAP) * s;
  };
  const baseRows = rowsAt(1);
  for (let s = MAX_SCALE; s >= MIN_SCALE; s -= SCALE_STEP) {
    if (s > 1 && rowsAt(s) > baseRows) continue;
    if (heightAt(s) <= height - V_MARGIN) return s;
  }
  return MIN_SCALE;
}

export function Board({
  jars,
  hidden,
  capacity,
  selected,
  hint,
  invalidJar,
  flight,
  onJarPress,
  onFlightDone,
}: Props) {
  const frames = useRef<Record<number, Frame>>({});
  // Sabit onPress referansları: Jar'ın memo'su her land/settled'da bozulmasın.
  const pressRef = useRef(onJarPress);
  pressRef.current = onJarPress;
  const pressHandlers = useMemo(
    () => jars.map((_, i) => () => pressRef.current(i)),
    [jars.length]
  );

  // Boardın içinde durduğu alanın ölçüsü.
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const scale = useMemo(
    () => (area ? pickScale(area.w, area.h, jars.length, capacity) : 1),
    [area, jars.length, capacity]
  );

  // Kademeli balık çizimi. Bir kez tamamlanınca (ör. ekstra kavanoz eklenince) bir daha bekletmez.
  const [revealed, setRevealed] = useState(0);
  const revealedAll = useRef(false);
  if (revealed >= jars.length) revealedAll.current = true;
  useEffect(() => {
    if (!area || revealed >= jars.length) return;
    const id = setTimeout(
      () => setRevealed((r) => Math.min(jars.length, r + REVEAL_BATCH)),
      REVEAL_TICK_MS
    );
    return () => clearTimeout(id);
  }, [area, revealed, jars.length]);

  // Görsel uçuşlar mantıksal uçuştan ayrıdır: son balık indiği anda dokunuşlar açılır,
  // dalga efekti arka planda bitene kadar oynamaya devam eder.
  const [visuals, setVisuals] = useState<Flight[]>([]);
  const [progress, setProgress] = useState<Progress>({});

  const hasFrames = (f: Flight) => !!frames.current[f.from] && !!frames.current[f.to];

  // Yeni uçuş, state'e yazılmasını beklemeden aynı render'da görünür (hedefte balık yanıp sönmesin).
  const active = useMemo(
    () =>
      flight && hasFrames(flight) && !visuals.some((v) => v.id === flight.id)
        ? [...visuals, flight]
        : visuals,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flight, visuals]
  );

  const handleLand = useCallback((id: number) => {
    setProgress((p) => ({
      ...p,
      [id]: { landed: (p[id]?.landed ?? 0) + 1, settled: p[id]?.settled ?? 0 },
    }));
  }, []);

  const handleSettled = useCallback((id: number) => {
    setProgress((p) => ({
      ...p,
      [id]: { landed: p[id]?.landed ?? 0, settled: (p[id]?.settled ?? 0) + 1 },
    }));
  }, []);

  // Uçuşu kalıcı listeye ekle (üst bileşen flight'ı null yapsa bile dalga bitene kadar kalır).
  useEffect(() => {
    if (!flight || !hasFrames(flight)) return;
    setVisuals((v) => (v.some((x) => x.id === flight.id) ? v : [...v, flight]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  // Tüm balıklar indiyse (ya da animasyon mümkün değilse) dokunuş kilidini aç.
  useEffect(() => {
    if (!flight) return;
    const landed = progress[flight.id]?.landed ?? 0;
    if (!hasFrames(flight) || landed >= flight.count) onFlightDone(flight.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight, progress, onFlightDone]);

  // Efekti bitenleri temizle.
  useEffect(() => {
    const finished = visuals.filter((v) => (progress[v.id]?.settled ?? 0) >= v.count);
    if (!finished.length) return;
    const ids = new Set(finished.map((v) => v.id));
    setVisuals((v) => v.filter((x) => !ids.has(x.id)));
    setProgress((p) => {
      const next = { ...p };
      ids.forEach((id) => delete next[id]);
      return next;
    });
  }, [visuals, progress]);

  // Yalnızca görünen balıklar sayılır; gizli ("?") olanlar animasyon yükü getirmez.
  const totalFish = jars.reduce((n, j, i) => n + j.length - (hidden?.[i] ?? 0), 0);
  const idleAnim = totalFish <= IDLE_ANIM_MAX_FISH;

  return (
    <View
      style={styles.area}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setArea((a) => (a && a.w === width && a.h === height ? a : { w: width, h: height }));
      }}
    >
      {area && (
        // Genişlik 1/scale ile ayarlanır, sonra tüm tahta scale kadar büyütülür:
        // kavanozlar, uçan balıklar ve koordinatlar aynı katmanda kaldığı için animasyonlar bozulmaz.
        <View style={[styles.board, { width: area.w / scale, transform: [{ scale }] }]}>
          {jars.map((fish, index) => {
            let hiddenTop = 0;
            for (const v of active) {
              if (v.to === index) hiddenTop += Math.max(0, v.count - (progress[v.id]?.landed ?? 0));
            }
            const complete =
              fish.length === capacity && fish.every((v) => v === fish[0]) && hiddenTop === 0;

            return (
              <View
                key={index}
                collapsable={false}
                onLayout={(e) => {
                  frames.current[index] = e.nativeEvent.layout;
                }}
              >
                <Jar
                  fish={fish}
                  capacity={capacity}
                  selected={selected === index}
                  hint={hint?.from === index ? 'from' : hint?.to === index ? 'to' : null}
                  invalid={invalidJar === index}
                  hiddenTop={hiddenTop}
                  hiddenBottom={hidden?.[index] ?? 0}
                  complete={complete}
                  animated={idleAnim}
                  showFish={revealedAll.current || index < revealed}
                  onPress={pressHandlers[index]}
                />
              </View>
            );
          })}

          {active.flatMap((v) => {
            const fromFrame = frames.current[v.from];
            const toFrame = frames.current[v.to];
            if (!fromFrame || !toFrame) return [];
            return Array.from({ length: v.count }, (_, k) => (
              <FlyingFish
                key={`${v.id}-${k}`}
                fishId={v.fishId}
                from={slotPoint(fromFrame, capacity, v.fromLen - 1 - k)}
                to={slotPoint(toFrame, capacity, v.toLen + k)}
                delay={k * STAGGER_MS}
                onLand={() => handleLand(v.id)}
                onSettled={() => handleSettled(v.id)}
              />
            ));
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Üst bileşendeki boardArea'yı doldurur ve ölçülür; tahta içinde dikey/yatay ortalanır.
  area: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    columnGap: COL_GAP,
    rowGap: ROW_GAP,
    paddingHorizontal: PAD_X,
  },
});