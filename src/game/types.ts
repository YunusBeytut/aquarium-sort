export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
// Akvaryumda dokunulunca / yem atılınca oynanan ortak tepki. Verilmezse 'wiggle'.
export type FishReaction = 'wiggle' | 'dive' | 'bubbles' | 'spin';
export type EggKind = 'normal' | 'rare';

export type FishDef = {
  id: number;
  name: string;
  rarity: Rarity;
  biome: string;
  bonusPct: number;
  // true ise yumurtadan çıkmaz, yalnızca mağazada inciyle satılır.
  storeOnly?: boolean;
  reaction?: FishReaction;
  template: 'round' | 'long' | 'flat' | 'fin';
  palette: { body: string; accent: string; pattern?: string };
};

export type BiomeDef = {
  id: string;
  name: string;
  unlockLevel: number;
};

// Mağazadaki dekor öğesi: oyun içi arka planlar, akvaryum aksesuarları ve akvaryum arka planları.
export type DecorDef = {
  id: string;
  kind: 'background' | 'accessory' | 'aquariumBackground';
  name: string;
  // Oyuncu bu levele gelince otomatik açılır. null ise yalnızca inciyle alınır.
  unlockLevel: number | null;
  // Level gelmeden önce erken açmanın inci bedeli.
  price: number;
  // Yalnızca aksesuarlarda: akvaryumda durduğu yer. Aynı yuvada tek aksesuar görünür.
  slot?: 'left' | 'right';
};

export type PlayerState = {
  version: number;
  currentLevel: number;
  pearls: number;
  // Değer 1 ise balık sahipliği var. Tekrar gelen balık sayıyı artırmaz.
  ownedFish: Record<number, number>;
  // İnciyle satın alınan dekor id'leri. Levelle açılanlar burada tutulmaz, currentLevel'dan hesaplanır.
  ownedDecor: string[];
  // Oyun içi arka plan: 'default' ya da bir DecorDef id'si.
  selectedBackground: string;
  // Akvaryum ekranının arka planı: 'aq-default' ya da bir 'aquariumBackground' DecorDef id'si.
  selectedAquariumBackground: string;
  // Akvaryumda gösterilen aksesuar id'leri (yuva başına en fazla bir tane).
  selectedAccessories: string[];
  eggs: { normal: number; rare: number };
  // Balık yemi stoğu. Akvaryuma dokununca 1 düşer. Balıklara oyun etkisi yok, yalnızca eğlence.
  food: number;
  boosters: { undo: number; extraJar: number; hint: number };
  settings: { sound: boolean; music: boolean; haptics: boolean; lang: string };
  noAds: boolean;
  // İlk açılış öğreticisi (level 1-3) tamamlandı mı.
  tutorialDone: boolean;
  daily: { lastClaim: string; streak: number };
  stats: { levelsPlayed: number; totalMoves: number };
  // Son epic/legendary çıkışından beri açılan yumurta sayısı
  pity: number;
  // Üst üste gelen tekrar balık sayısı (normal yumurta güvencesi için)
  dupStreak: number;
};