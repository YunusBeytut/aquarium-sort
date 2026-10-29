import { EggKind, Rarity } from './types';

// Tüm ekonomi sayıları burada. Denge ayarı için tek yer.

export const REWARD = {
  basePearls: 30,
  perLevel: 0.2,
  levelCap: 200,
  // Koleksiyon tamamlanınca ödüle gelen en yüksek bonus yüzdesi (balık sayısından bağımsız).
  collectionBonusMaxPct: 40,
  bossEvery: 10,
  bossMultiplier: 3,
  // Bedava yumurta her 25 levelde bir, sırayla: 25 normal, 50 nadir, 75 normal, 100 nadir...
  freeEggEvery: 25,
  // Gizli balıklı levellerde inci ödülüne eklenen yüzde.
  hiddenBonusPct: 25,
};

// Level 1'deki taban fiyatlar.
export const EGG_PRICE: Record<EggKind, number> = {
  normal: 250,
  rare: 1500,
};

// Her level için taban fiyata eklenen miktar.
export const EGG_PRICE_PER_LEVEL: Record<EggKind, number> = {
  normal: 1.5,
  rare: 7.5,
};

// Yumurtanın o anki fiyatı: level ilerledikçe artar, 5'in katına yuvarlanır.
export function eggPrice(kind: EggKind, level: number): number {
  const raw = EGG_PRICE[kind] + EGG_PRICE_PER_LEVEL[kind] * Math.max(0, level - 1);
  return Math.round(raw / 5) * 5;
}

export const EGG_ODDS: Record<EggKind, Record<Rarity, number>> = {
  normal: { common: 0.7, rare: 0.24, epic: 0.05, legendary: 0.01 },
  rare: { common: 0.3, rare: 0.45, epic: 0.2, legendary: 0.05 },
};

// Bu kadar yumurtada epic/legendary çıkmazsa sonraki yumurta garantili
export const PITY_LIMIT = 20;

// Normal yumurtada üst üste bu kadar tekrar balık çıkarsa sonraki yumurta yeni balık garantili.
// (Nadir yumurta zaten her zaman önce sahip olunmayan balıkları seçer.)
export const DUPLICATE_STREAK_LIMIT = 2;

// Elde olan balık tekrar çıkarsa verilen inci
export const DUPLICATE_PEARLS: Record<Rarity, number> = {
  common: 20,
  rare: 60,
  epic: 150,
  legendary: 400,
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

// Yetenek hakkının inci fiyatı (tek hak için).
export const BOOSTER_PRICE = { undo: 50, extraJar: 100, hint: 150 };
// Oyuncunun başlangıçta sahip olduğu yetenek hakları (level değişince yenilenmez).
export const START_BOOSTERS = { undo: 3, extraJar: 3, hint: 3 };
// Ödüllü videoyu izleyince verilen hak sayısı.
export const BOOSTER_AD_REWARD = 1;
// Mağazada satılan özel canlıların (storeOnly) fiyatı.
export const SHOP_FISH_PRICE = 5000;

// Balık yemi: balıklara oyun etkisi yok, yalnızca eğlence ve inci harcama yeri.
// Yeni oyuncunun ilk yem stoğu: yemi denesin, bitince mağazadan alsın.
export const FOOD_START = 10;
// Mağazadaki yem paketi (inciyle). Bir level ödülü ~30-40 inci: bir level ≈ 7 yem.
// Yem ucuz ve sık alınan bir harcama olsun diye fiyat leveline göre artmaz.
export const FOOD_PACK = { amount: 10, price: 100 };