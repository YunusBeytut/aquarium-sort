import { Jars, isJarUniformFull, topGroupSize } from './rules';
import fishJson from '../data/fish.json';
import { solve } from './solver';

export type Difficulty = 'easy' | 'mid' | 'hard' | 'boss';

export type LevelConfig = {
  types: number;
  capacity: number;
  emptyJars: number;
  difficulty: Difficulty;
  hiddenJars: number; // gizli balıklı kavanoz sayısı
};

export type GeneratedLevel = {
  level: number;
  jars: Jars;
  capacity: number;
  fishIds: number[];
  solutionLength: number;
  hidden: number[]; // her kavanozda alttaki kaç balık gizli
  difficulty: Difficulty;
};

const HIDDEN_START_LEVEL = 11; // gizli balıklar bu leveldan itibaren
const MAX_JARS = 14; // toplam kavanoz tavanı
const HIDDEN_RATIO: Record<Difficulty, number> = { easy: 0, mid: 0.3, hard: 0.6, boss: 0.8 };

const E: Difficulty = 'easy';
const M: Difficulty = 'mid';
const H: Difficulty = 'hard';
const B: Difficulty = 'boss';

// Sıra: level 1..9, sonra 0 (boss). Şablonlar 10'luk bloklara göre dönüşümlü kullanılır.
const CYCLES: Difficulty[][] = [
  [E, M, M, M, H, E, M, M, H, B],
  [E, M, H, M, M, E, M, H, M, B],
  [E, M, M, H, M, E, H, M, M, B],
];

export function getDifficulty(level: number): Difficulty {
  const cycle = CYCLES[Math.floor((level - 1) / 10) % CYCLES.length];
  return cycle[(level - 1) % 10];
}

export function getConfig(level: number): LevelConfig {
  let types: number;
  if (level <= 20) types = 3 + Math.floor(((level - 1) * 4) / 20);
  else if (level <= 60) types = 6 + Math.floor(((level - 21) * 4) / 40);
  else if (level <= 150) types = 9 + Math.floor(((level - 61) * 4) / 90);
  else types = 12;
  types = Math.min(types, 12);

  const difficulty = getDifficulty(level);
  const capacity = level > 200 ? 5 : 4;
  let emptyJars = level <= 100 ? 2 : 1;

  if (difficulty === 'easy') types = Math.max(3, types - 1);
  if (difficulty === 'hard') emptyJars = Math.max(1, emptyJars - 1);
  if (difficulty === 'boss') {
    types = Math.min(types + 2, MAX_JARS - 1);
    emptyJars = Math.max(1, Math.min(emptyJars, MAX_JARS - types));
  }

  const hiddenJars =
    level >= HIDDEN_START_LEVEL ? Math.round(HIDDEN_RATIO[difficulty] * types) : 0;
  return { types, capacity, emptyJars, difficulty, hiddenJars };
}

// Seed'li rastgele sayı üreteci (mulberry32)
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type RevMove = { from: number; to: number; k: number };

// Gerçek oyun hamlesinin tersi. `from` kavanozunun üstünden k balık alınıp
// `to` kavanozuna konur. Sonuç, oyun kurallarıyla ileri doğru oynanabilen
// bir durumun geri hali olduğu için üretilen level her zaman çözülebilirdir.
function reverseMoves(jars: Jars, capacity: number): RevMove[] {
  const moves: RevMove[] = [];
  for (let from = 0; from < jars.length; from++) {
    const b = jars[from];
    if (b.length === 0) continue;
    const c = b[b.length - 1];
    let g = 0;
    for (let i = b.length - 1; i >= 0 && b[i] === c; i--) g++;
    for (let k = 1; k <= g; k++) {
      // Geri alınan hamlenin öncesinde kaynak boş olmalı ya da üstünde aynı tür kalmalı
      if (!(k < g || k === b.length)) continue;
      for (let to = 0; to < jars.length; to++) {
        if (to === from) continue;
        const a = jars[to];
        if (a.length + k > capacity) continue;
        const aTop = a.length > 0 ? a[a.length - 1] : -1;
        // Hedefin üstünde aynı tür varsa, ileri hamlede tam k balık taşınması
        // için kaynak (from) kavanozunun dolu olması gerekir.
        if (aTop === c && b.length !== capacity) continue;
        moves.push({ from, to, k });
      }
    }
  }
  return moves;
}

function applyReverse(jars: Jars, m: RevMove): Jars {
  const next = jars.map((j) => j.slice());
  const moved = next[m.from].splice(next[m.from].length - m.k, m.k);
  next[m.to].push(...moved);
  return next;
}

function countEmpty(jars: Jars): number {
  let n = 0;
  for (const j of jars) if (j.length === 0) n++;
  return n;
}

// Çözülmüş durumdan geriye doğru karıştırır. Sonunda tam olarak `emptyJars`
// kavanoz boş, diğerleri tam dolu olur.
function scramble(fishIds: number[], config: LevelConfig, rng: () => number): Jars | null {
  const { capacity, emptyJars } = config;
  let jars: Jars = [];
  for (const id of fishIds) jars.push(new Array(capacity).fill(id));
  for (let i = 0; i < emptyJars; i++) jars.push([]);

  const mixSteps = fishIds.length * capacity * 6;
  for (let s = 0; s < mixSteps; s++) {
    const moves = reverseMoves(jars, capacity);
    if (moves.length === 0) break;
    jars = applyReverse(jars, moves[Math.floor(rng() * moves.length)]);
  }

  // Boş kavanoz sayısı hedefe inene kadar toparla
  const settleLimit = fishIds.length * capacity * 12;
  for (let s = 0; s < settleLimit && countEmpty(jars) < emptyJars; s++) {
    const moves = reverseMoves(jars, capacity);
    if (moves.length === 0) return null;
    // Kaynağı boşaltıp dolu kavanoza yığan hamleleri tercih et
    const packing = moves.filter(
      (m) => jars[m.from].length === m.k && jars[m.to].length > 0
    );
    const pool = packing.length > 0 ? packing : moves;
    jars = applyReverse(jars, pool[Math.floor(rng() * pool.length)]);
  }

  if (countEmpty(jars) !== emptyJars) return null;
  return jars;
}

// Kavanozda yan yana duran aynı tür çifti sayısı (az olması = daha karışık).
function adjacentSame(jar: number[]): number {
  let n = 0;
  for (let i = 1; i < jar.length; i++) if (jar[i] === jar[i - 1]) n++;
  return n;
}

// Gizli balıklı kavanozları seçer. Üstteki grup her zaman açık kalır.
// Aynı türün sıralı dizildiği kavanozlar gizlenmez, önce en karışık olanlar seçilir.
function pickHidden(jars: Jars, count: number, rng: () => number): number[] {
  const hidden = jars.map(() => 0);
  if (count <= 0) return hidden;
  const candidates = jars
    .map((_, i) => i)
    .filter((i) => jars[i].length - topGroupSize(jars[i]) > 0);
  const ranked = shuffle(candidates, rng).sort(
    (a, b) => adjacentSame(jars[a]) - adjacentSame(jars[b])
  );
  for (const i of ranked.slice(0, count)) {
    hidden[i] = jars[i].length - topGroupSize(jars[i]);
  }
  return hidden;
}

const MAX_ATTEMPTS = 300;
const SOLVER_NODE_LIMIT = 40000;

// Bulmaca havuzu: mağazaya özel olmayan tüm balıklar (fish.json'a eklenen yeni balık kendiliğinden girer).
const PUZZLE_FISH_IDS = (fishJson as { id: number; storeOnly?: boolean }[])
  .filter((f) => !f.storeOnly)
  .map((f) => f.id);

function defaultPool(_config: LevelConfig): number[] {
  return PUZZLE_FISH_IDS;
}

// Tek bir üretim denemesi. Başarısızsa null.
function tryAttempt(
  level: number,
  config: LevelConfig,
  pool: number[],
  attempt: number
): GeneratedLevel | null {
  const rng = makeRng(level * 7919 + attempt * 104729);
  const fishIds = shuffle(pool, rng).slice(0, config.types);
  const jars = scramble(fishIds, config, rng);
  if (!jars) return null;

  // Başlangıçta hazır (tam dolu tek renkli) kavanoz bırakma
  if (jars.some((j) => isJarUniformFull(j, config.capacity))) return null;

  // Çözücü gerçek balıkları bilir, gizlilikten etkilenmez.
  const solution = solve(jars, config.capacity, SOLVER_NODE_LIMIT);
  if (!solution) return null;

  return {
    level,
    jars,
    capacity: config.capacity,
    fishIds,
    solutionLength: solution.length,
    hidden: pickHidden(jars, config.hiddenJars, rng),
    difficulty: config.difficulty,
  };
}

// Önceden üretilen leveller (varsayılan balık havuzu için). Eskiler temizlenir.
const cache = new Map<number, GeneratedLevel>();
function remember(lv: GeneratedLevel) {
  cache.set(lv.level, lv);
  for (const k of cache.keys()) if (k < lv.level - 2) cache.delete(k);
}

// Önceden üretilmiş (scripts/buildLevels.ts) leveller. Varsa üretim yapılmaz, anında açılır.
const baked = new Map<number, GeneratedLevel>();
export function registerBaked(list: GeneratedLevel[]): void {
  for (const l of list) baked.set(l.level, l);
}

export function generateLevel(level: number, fishPool?: number[]): GeneratedLevel {
  if (!fishPool) {
    const hit = baked.get(level) ?? cache.get(level);
    if (hit) return hit;
  }
  const config = getConfig(level);
  const pool = fishPool ?? defaultPool(config);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const lv = tryAttempt(level, config, pool, attempt);
    if (lv) {
      if (!fishPool) remember(lv);
      return lv;
    }
  }
  throw new Error(`Level ${level} üretilemedi`);
}

// Hazır (baked ya da önbellekte) level varsa anında döndürür, yoksa null. Üretim yapmaz.
export function peekLevel(level: number): GeneratedLevel | null {
  return baked.get(level) ?? cache.get(level) ?? null;
}

// Aynı level için tek bir üretim işi çalışır: prefetch ile ekran açılışı işi paylaşır,
// aynı level iki kez üretilmez.
const inflight = new Map<number, Promise<GeneratedLevel>>();

function generateInBackground(level: number): Promise<GeneratedLevel> {
  const running = inflight.get(level);
  if (running) return running;

  const job = (async () => {
    const config = getConfig(level);
    const pool = defaultPool(config);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Her denemeden önce arayüze nefes aldır, oyun donmasın.
      await new Promise<void>((r) => setTimeout(r, 0));
      const lv = tryAttempt(level, config, pool, attempt);
      if (lv) {
        remember(lv);
        return lv;
      }
    }
    throw new Error(`Level ${level} üretilemedi`);
  })();

  inflight.set(level, job);
  const clear = () => inflight.delete(level);
  job.then(clear, clear);
  return job;
}

// Level ekranı bunu kullanır: hazırsa anında, değilse arka planda üretip döndürür.
export async function loadLevel(level: number): Promise<GeneratedLevel> {
  return peekLevel(level) ?? generateInBackground(level);
}

// Sonraki leveli arka planda üretir. Sonuç `generateLevel` ile aynıdır.
export async function prefetchLevel(level: number): Promise<void> {
  if (peekLevel(level)) return;
  try {
    await generateInBackground(level);
  } catch {
    // Prefetch başarısız olursa level açılırken tekrar denenir.
  }
}