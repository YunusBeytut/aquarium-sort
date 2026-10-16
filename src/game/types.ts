export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type EggKind = 'normal' | 'rare';

export type FishDef = {
  id: number;
  name: string;
  rarity: Rarity;
  biome: string;
  bonusPct: number;
  template: 'round' | 'long' | 'flat' | 'fin';
  palette: { body: string; accent: string; pattern?: string };
};

export type BiomeDef = {
  id: string;
  name: string;
  unlockLevel: number;
};

export type PlayerState = {
  version: number;
  currentLevel: number;
  pearls: number;
  // Değer 1 ise balık sahipliği var. Tekrar gelen balık sayıyı artırmaz.
  ownedFish: Record<number, number>;
  ownedDecor: string[];
  eggs: { normal: number; rare: number };
  boosters: { undo: number; extraJar: number; hint: number };
  settings: { sound: boolean; haptics: boolean; lang: string };
  noAds: boolean;
  daily: { lastClaim: string; streak: number };
  stats: { levelsPlayed: number; totalMoves: number };
  // Son epic/legendary çıkışından beri açılan yumurta sayısı
  pity: number;
};