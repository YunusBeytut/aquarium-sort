import { EggKind, Rarity } from './types';

// Tüm ekonomi sayıları burada. Denge ayarı için tek yer.

export const REWARD = {
  basePearls: 30,
  perLevel: 0.2,
  levelCap: 200,
  maxBonusPct: 100,
  bossEvery: 10,
  bossMultiplier: 3,
  normalEggEvery: 3,
  // Gizli balıklı levellerde inci ödülüne eklenen yüzde.
  hiddenBonusPct: 25,
};

export const EGG_PRICE: Record<EggKind, number> = {
  normal: 100,
  rare: 500,
};

export const EGG_ODDS: Record<EggKind, Record<Rarity, number>> = {
  normal: { common: 0.7, rare: 0.24, epic: 0.05, legendary: 0.01 },
  rare: { common: 0.3, rare: 0.45, epic: 0.2, legendary: 0.05 },
};

// Bu kadar yumurtada epic/legendary çıkmazsa sonraki yumurta garantili
export const PITY_LIMIT = 20;

// Elde olan balık tekrar çıkarsa verilen inci
export const DUPLICATE_PEARLS: Record<Rarity, number> = {
  common: 20,
  rare: 60,
  epic: 150,
  legendary: 400,
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export const BOOSTER_PRICE = 50;