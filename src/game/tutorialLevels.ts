import type { GeneratedLevel } from './levelGenerator';

// İlk açılışta oynanan, elle hazırlanmış öğretici leveller. Yazı yok: yalnızca yumuşak bir el
// ve halka animasyonu yol gösterir. Üretilen/hazır levellerin yerine geçer (bakedLevels.ts).
//
// Çözüm uzunlukları çözücüyle doğrulandı (level 1: 2 hamle, level 2: 3 hamle, level 3: 5 hamle).
// Yeni bir öğretici level eklemek ya da değiştirmek istersen, düzeni değiştirdikten sonra
// çözülebilir olduğundan emin ol (solver.solve ile).

// Öğreticinin son leveli. Bu level tamamlanınca öğretici bir daha açılmaz.
export const TUTORIAL_LAST_LEVEL = 3;

// Level başına el animasyonunun bekleme süreleri (ms): [ilk hamle öncesi, sonraki adımlar öncesi].
// Level 3'te el yalnızca oyuncu bir süre beklerse çıkar.
export const TUTORIAL_IDLE_MS: Record<number, readonly [number, number]> = {
  1: [600, 700],
  2: [1400, 2500],
  3: [6000, 6000],
};

// Öğretici sırasında alttaki yardımcı düğmeler (geri al, ipucu...) bu levele kadar gizlenir.
export const TUTORIAL_HELPERS_FROM_LEVEL = 3;

const ZERO = (n: number) => new Array<number>(n).fill(0);

export const TUTORIAL_LEVELS: GeneratedLevel[] = [
  // Level 1: iki renk, her rengin bir kavanozu eksik. Dokun, sonra aynı renge dokun.
  {
    level: 1,
    jars: [[0, 0, 0], [0], [1, 1, 1], [1]],
    capacity: 4,
    fishIds: [0, 1],
    solutionLength: 2,
    hidden: ZERO(4),
    difficulty: 'easy',
  },
  // Level 2: boş kavanozu kullanmak ve birden fazla balığı birlikte taşımak.
  {
    level: 2,
    jars: [[2, 2, 3, 3], [3, 3, 2, 2], []],
    capacity: 4,
    fishIds: [2, 3],
    solutionLength: 3,
    hidden: ZERO(3),
    difficulty: 'easy',
  },
  // Level 3: üç renk, iki boş kavanoz. El yalnızca oyuncu beklerse çıkar.
  {
    level: 3,
    jars: [[0, 0, 1, 1], [0, 0, 1, 2], [2, 2, 2, 1], [], []],
    capacity: 4,
    fishIds: [0, 1, 2],
    solutionLength: 5,
    hidden: ZERO(5),
    difficulty: 'easy',
  },
];
